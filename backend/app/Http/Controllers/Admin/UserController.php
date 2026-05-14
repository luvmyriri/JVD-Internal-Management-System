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

class UserController extends Controller
{
    /**
     * List all users (paginated).
     * Super Admin / Admin only.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('employee_id', 'ilike', "%{$search}%");
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
        $tempPassword = Str::random(16);

        $user = User::create([
            'employee_id' => $request->employee_id,
            'email' => $request->email,
            'password' => Hash::make($tempPassword),
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
            'department' => $request->department,
            'is_active' => true,
            'must_change_password' => true,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'temporary_password' => $tempPassword,  // Display once, never stored in plaintext
            ],
            'message' => 'Account created. Provide the temporary password to the employee securely.',
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
            'role' => ['sometimes', 'in:admin,human_resource,accounting,agent'],
            'department' => ['nullable', 'string', 'max:100'],
        ]);

        $user->update($validated);

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

        return response()->json([
            'success' => true,
            'data' => [
                'temporary_password' => $tempPassword,
            ],
            'message' => 'Password reset. Provide the new temporary password securely.',
        ]);
    }
}
