<?php

namespace App\Http\Middleware;

use App\Models\RolePermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Usage in routes:
     *   ->middleware('role:admin,agent')                   — legacy: check role name only
     *   ->middleware('role:admin,agent|procurement:view')   — hybrid: role + module permission check
     *
     * The pipe syntax allows combining hardcoded role gates with dynamic permissions.
     * Format: role1,role2|module:action
     *   action = view | create | edit | delete
     *
     * Super Admin always bypasses all checks.
     */
    public function handle(Request $request, Closure $next, string ...$params): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Insufficient permissions.',
            ], 403);
        }

        // Super Admin always passes
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // Parse params — look for module:action format
        $roles = [];
        $moduleCheck = null;

        foreach ($params as $param) {
            if (str_contains($param, ':')) {
                // This is a module:action pair (e.g., "procurement:view")
                $moduleCheck = $param;
            } else {
                $roles[] = $param;
            }
        }

        // Step 1: If module:action check is specified, use dynamic permissions
        if ($moduleCheck) {
            [$module, $action] = explode(':', $moduleCheck, 2);
            $permKey = 'can_' . $action;

            $hasHardcodedRole = !empty($roles) && in_array($user->role, $roles);
            $allPerms = $user->getAllPermissions();
            $hasDynamicPerm = isset($allPerms[$module][$permKey]) && $allPerms[$module][$permKey] === true;

            if (!$hasHardcodedRole && !$hasDynamicPerm) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You do not have permission to access this module.',
                ], 403);
            }

            return $next($request);
        }

        // Step 2: Legacy role-only check (backward-compatible)
        if (!empty($roles) && !in_array($user->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Insufficient permissions.',
            ], 403);
        }

        return $next($request);
    }
}
