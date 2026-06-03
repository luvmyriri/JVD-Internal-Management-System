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
use Illuminate\Support\Facades\Password;
use App\Http\Services\AuditLogService;
use App\Notifications\AccountInvitation;
use App\Notifications\TempPasswordNotification;

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
     * Admin creates account → assigns role → system generates temp password
     * (Account Lifecycle — Architecture § 2.1)
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $sendInvitation = $request->boolean('send_invitation');
        $tempPassword = null;

        $userData = [
            'employee_id' => $request->employee_id,
            'email' => $request->email,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
            'department' => $request->department,
            'is_active' => true,
            'must_change_password' => !$sendInvitation,
            'created_by' => auth()->id(),
        ];

        if (!$sendInvitation) {
            $tempPassword = Str::random(16);
            $userData['password'] = Hash::make($tempPassword);
        }

        $user = User::create($userData);

        if ($sendInvitation) {
            // Generate password reset token for the new user
            // @phpstan-ignore-next-line — createToken() exists on the concrete broker at runtime
            $token = Password::broker()->createToken($user);
            $user->notify(new AccountInvitation($token, $user->email));
        } else {
            // Send temporary password to the employee's email
            $user->notify(new TempPasswordNotification($tempPassword));
        }

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
                'temporary_password' => $tempPassword,
                'invitation_sent' => $sendInvitation,
            ],
            'message' => $sendInvitation 
                ? 'Account created and invitation email sent to ' . $user->email 
                : 'Account created. Provide the temporary password to the employee securely.',
        ], 201);
    }

    /**
     * Update user details.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'role' => ['sometimes', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department' => ['nullable', 'string', 'max:100'],
            'custom_permissions' => ['nullable', 'array'],
        ]);

        $oldValues = $user->getOriginal();
        $user->update($validated);

        // Explicit Audit Log
        AuditLogService::log(
            action: 'UPDATE_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id,
            old: $oldValues,
            new: $user->fresh()->toArray()
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
        if ($user->role === 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot deactivate the Super Admin account.',
            ], 403);
        }

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
     * Reset a user's password (generates new temp password).
     */
    public function resetPassword(User $user): JsonResponse
    {
        $tempPassword = Str::random(16);

        $user->update([
            'password' => Hash::make($tempPassword),
            'must_change_password' => true,
        ]);

        // Revoke all tokens so user must re-login
        $user->tokens()->delete();

        // Explicit Audit Log
        AuditLogService::log(
            action: 'RESET_PASSWORD',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id
        );

        return response()->json([
            'success' => true,
            'data' => [
                'temporary_password' => $tempPassword,
            ],
            'message' => 'Password reset. Provide the new temporary password securely.',
        ]);
    }

    /**
     * Super Admin: directly set a specific password for any user.
     * Only accessible by super_admin (enforced at route level).
     */
    public function setPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'new_password'              => ['required', 'string', 'min:8', 'confirmed'],
            'new_password_confirmation' => ['required'],
        ]);

        $user->update([
            'password'             => Hash::make($validated['new_password']),
            'must_change_password' => false,
        ]);

        // Revoke all active tokens so the user must re-login with the new password
        $user->tokens()->delete();

        // Audit log
        AuditLogService::log(
            action: 'SET_PASSWORD',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Password updated. The user must log in again with the new password.',
        ]);
    }
}
