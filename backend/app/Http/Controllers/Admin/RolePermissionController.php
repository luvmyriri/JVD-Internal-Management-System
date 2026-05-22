<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Services\AuditLogService;
use App\Models\RolePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Get all permissions for all configurable roles.
     * Returns a structured matrix: { role: { module: { can_view, can_create, can_edit, can_delete } } }
     */
    public function index(): JsonResponse
    {
        $result = [];

        foreach (RolePermission::CONFIGURABLE_ROLES as $role) {
            $result[$role] = RolePermission::getForRole($role);
        }

        return response()->json([
            'success' => true,
            'data'    => $result,
            'meta'    => [
                'modules' => RolePermission::MODULES,
                'roles'   => RolePermission::CONFIGURABLE_ROLES,
            ],
        ]);
    }

    /**
     * Get permissions for a specific role.
     */
    public function show(string $role): JsonResponse
    {
        if (!in_array($role, RolePermission::CONFIGURABLE_ROLES)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or non-configurable role.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => RolePermission::getForRole($role),
            'meta'    => [
                'modules' => RolePermission::MODULES,
                'role'    => $role,
            ],
        ]);
    }

    /**
     * Bulk-update permissions for a specific role.
     *
     * Body: { "permissions": { "module_key": { "can_view": true, ... }, ... } }
     */
    public function update(Request $request, string $role): JsonResponse
    {
        if (!in_array($role, RolePermission::CONFIGURABLE_ROLES)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or non-configurable role.',
            ], 422);
        }

        $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required', 'array'],
            'permissions.*.can_view'   => ['required', 'boolean'],
            'permissions.*.can_create' => ['required', 'boolean'],
            'permissions.*.can_edit'   => ['required', 'boolean'],
            'permissions.*.can_delete' => ['required', 'boolean'],
        ]);

        $permissions = $request->permissions;
        $validModules = array_keys(RolePermission::MODULES);
        $oldPermissions = RolePermission::getForRole($role);

        foreach ($permissions as $module => $actions) {
            if (!in_array($module, $validModules)) {
                continue; // Skip invalid module keys silently
            }

            RolePermission::updateOrCreate(
                ['role' => $role, 'module' => $module],
                [
                    'can_view'   => $actions['can_view'] ?? false,
                    'can_create' => $actions['can_create'] ?? false,
                    'can_edit'   => $actions['can_edit'] ?? false,
                    'can_delete' => $actions['can_delete'] ?? false,
                ]
            );
        }

        // Flush cached permissions for this role
        RolePermission::flushCache($role);

        // Audit log
        AuditLogService::log(
            action: 'UPDATE_ROLE_PERMISSIONS',
            module: 'admin',
            entityType: 'role_permission',
            entityId: null,
            old: ['role' => $role, 'permissions' => $oldPermissions],
            new: ['role' => $role, 'permissions' => RolePermission::getForRole($role)]
        );

        return response()->json([
            'success' => true,
            'data'    => RolePermission::getForRole($role),
            'message' => "Permissions for '{$role}' updated successfully.",
        ]);
    }

    /**
     * Reset a role's permissions back to factory defaults.
     */
    public function reset(string $role): JsonResponse
    {
        if (!in_array($role, RolePermission::CONFIGURABLE_ROLES)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or non-configurable role.',
            ], 422);
        }

        // Delete all permission rows for this role and re-seed
        $oldPermissions = RolePermission::getForRole($role);
        RolePermission::where('role', $role)->delete();

        // Re-run seeder for this role
        // We can't easily call run() for one role, so just run the full seeder
        // and it will updateOrCreate, which is idempotent
        \Artisan::call('db:seed', ['--class' => 'RolePermissionSeeder', '--force' => true]);

        RolePermission::flushCache($role);

        AuditLogService::log(
            action: 'RESET_ROLE_PERMISSIONS',
            module: 'admin',
            entityType: 'role_permission',
            entityId: null,
            old: ['role' => $role, 'permissions' => $oldPermissions],
            new: ['role' => $role, 'permissions' => RolePermission::getForRole($role)]
        );

        return response()->json([
            'success' => true,
            'data'    => RolePermission::getForRole($role),
            'message' => "Permissions for '{$role}' reset to defaults.",
        ]);
    }
}
