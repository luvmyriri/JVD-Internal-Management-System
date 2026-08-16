<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use App\Services\AuditLogService;
use App\Notifications\AccountInvitation;

class UserController extends Controller
{
    /**
     * List all users (paginated).
     * Super Admin / Admin only.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('tokens');


        // Filter by role (filled() ignores empty strings — prevents WHERE role = '' returning zero results)
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('last_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('email', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('employee_id', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
                       ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users)->resolve(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * List all users for the chat directory (active only, no pagination).
     * Accessible by all authenticated users.
     */
    public function chatUsers(Request $request): JsonResponse
    {
        $users = User::where('is_active', true)->orderBy('first_name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users)->resolve(),
        ]);
    }

    /**
     * Show a single user.
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Create a new user account.
     * Admin creates account, assigns a permitted role, and the employee receives
     * a one-time password-setup link.
     * (Account Lifecycle — Architecture § 2.1)
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $employeeId = $request->employee_id;
        if (!$employeeId) {
            $latest = User::withTrashed()->orderBy('id', 'desc')->first();
            $nextId = $latest ? ($latest->id + 1001) : 1001;
            $employeeId = 'JVD-EMP-' . $nextId;
        }

        $userData = [
            'employee_id' => $employeeId,
            'email' => strtolower(trim($request->email)),
            'phone' => $request->phone,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
            'department' => $request->department,
            'tags' => $request->tags,
            'is_active' => true,
            // Keep login impossible until the employee completes the signed
            // password-setup flow. This value is never disclosed or sent.
            'password' => Hash::make(Str::random(64)),
            'must_change_password' => true,
            'created_by' => auth()->id(),
        ];

        $user = User::create($userData);

        // @phpstan-ignore-next-line - createToken() exists on the concrete broker at runtime.
        $token = Password::broker()->createToken($user);
        $user->notify(new AccountInvitation($token, $user->email));

        // Explicit Audit Log
        AuditLogService::log(
            action: 'CREATE_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id,
            new: $user->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'invitation_sent' => true,
                'setup_required' => true,
            ],
            'message' => 'Account created and a secure password-setup link was sent to ' . $user->email,
        ], 201);
    }

    /**
     * Update user details.
     */
    public function update(\App\Http\Requests\UpdateUserRequest $request, User $user): JsonResponse
    {
        // The request applies the same policy checks before validation. Keep
        // controller-level authorization as defense in depth for future routes.
        Gate::authorize('update', $user);
        if ($request->has('role')) {
            Gate::authorize('assignRole', [$user, (string) $request->input('role')]);
        }

        // Only super_admin can grant/modify custom module permissions — this field
        // overrides role-based access in User::getAllPermissions(), so anyone else
        // with hr:edit could otherwise self-escalate to any module permission.
        if ($request->has('custom_permissions') && $request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized. Only a Super Admin can modify custom permissions.');
        }

        $validated = $request->validated();
        if (isset($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        // Use getRawOriginal() to avoid triggering decryption of encrypted columns
        // (e.g. totp_secret) which would throw a DecryptException if the APP_KEY
        // was rotated since the value was stored.
        $oldValues = collect($user->getRawOriginal())
            ->except(['totp_secret', 'password', 'remember_token'])
            ->toArray();

        $user->update($validated);

        // Explicit Audit Log
        AuditLogService::log(
            action: 'UPDATE_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id,
            old: $oldValues,
            new: collect($user->fresh()->getRawOriginal())
                ->except(['totp_secret', 'password', 'remember_token'])
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()),
            'message' => 'User updated successfully.',
        ]);
    }

    /**
     * Deactivate a user account (soft disable).
     * Admin can deactivate/revoke any account instantly (Architecture § 2.1)
     */
    public function deactivate(User $user): JsonResponse
    {
        Gate::authorize('deactivate', $user);

        $user->update(['is_active' => false]);

        // Revoke all active tokens
        $user->tokens()->delete();

        // Explicit Audit Log
        AuditLogService::log(
            action: 'DEACTIVATE_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Account deactivated and all sessions revoked.',
        ]);
    }

    /**
     * Reactivate a disabled account.
     */
    public function activate(User $user): JsonResponse
    {
        Gate::authorize('activate', $user);

        $user->update(['is_active' => true]);

        // Explicit Audit Log
        AuditLogService::log(
            action: 'ACTIVATE_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Account reactivated.',
        ]);
    }

    /**
     * Invalidate the current credential and send a one-time setup link.
     */
    public function resetPassword(User $user): JsonResponse
    {
        Gate::authorize('resetPassword', $user);

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Activate this account before sending a password-reset link.',
            ], 422);
        }

        $user->update([
            // Immediately invalidate a potentially compromised password. This
            // replacement is never returned or sent to any person.
            'password' => Hash::make(Str::random(64)),
            'must_change_password' => true,
        ]);

        // Revoke all tokens so user must re-login
        $user->tokens()->delete();

        // @phpstan-ignore-next-line - createToken() exists on the concrete broker at runtime.
        $token = Password::broker()->createToken($user);
        $user->notify(new AccountInvitation($token, $user->email, true));

        // Explicit Audit Log
        AuditLogService::log(
            action: 'REQUEST_PASSWORD_RESET',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id
        );

        return response()->json([
            'success' => true,
            'data' => [
                'setup_link_sent' => true,
            ],
            'message' => 'The existing credential was invalidated and a secure password-reset link was sent to the employee.',
        ]);
    }

}
