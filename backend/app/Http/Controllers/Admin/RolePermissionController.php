<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Models\RolePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Get all permissions for all configurable roles.
     * Returns a structured matrix including both module-level and page-level keys:
     * { role: { 'module' | 'module.page': { can_view, can_create, can_edit, can_delete } } }
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
                'modules'       => RolePermission::MODULES,
                'pages'         => RolePermission::PAGES,
                'roles'         => RolePermission::CONFIGURABLE_ROLES,
                'all_keys'      => RolePermission::allKeys(),
            ],
        ]);
    }

    /**
     * Get permissions for a specific role (both module and page keys).
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
                'pages'   => RolePermission::PAGES,
                'role'    => $role,
            ],
        ]);
    }

    /**
     * Bulk-update permissions for a specific role.
     * Accepts both module keys (e.g. "accounting") and page keys (e.g. "accounting.pos").
     *
     * Body: { "permissions": { "module_or_page_key": { "can_view": true, ... }, ... } }
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
            'permissions'              => ['required', 'array'],
            'permissions.*'            => ['required', 'array'],
            'permissions.*.can_view'   => ['required', 'boolean'],
            'permissions.*.can_create' => ['required', 'boolean'],
            'permissions.*.can_edit'   => ['required', 'boolean'],
            'permissions.*.can_delete' => ['required', 'boolean'],
        ]);

        $permissions = $request->permissions;
        $validKeys   = RolePermission::allKeys();
        $oldPermissions = RolePermission::getForRole($role);

        foreach ($permissions as $key => $actions) {
            if (!in_array($key, $validKeys)) {
                continue; // Silently skip unknown keys
            }

            RolePermission::updateOrCreate(
                ['role' => $role, 'module' => $key],
                [
                    'can_view'   => $actions['can_view']   ?? false,
                    'can_create' => $actions['can_create'] ?? false,
                    'can_edit'   => $actions['can_edit']   ?? false,
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

        $oldPermissions = RolePermission::getForRole($role);

        // Delete all permission rows for this role and re-seed
        RolePermission::where('role', $role)->delete();

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

    // ──────────────────────────────────────────
    // Named abilities (roadmap 2.3) — roles-as-data
    // ──────────────────────────────────────────

    /**
     * The ability registry plus each configurable role's granted abilities.
     * { registry: {'module.ability': 'Label'}, roles: { role: ['module.ability', ...] } }
     */
    public function abilities(): JsonResponse
    {
        $roles = [];
        foreach (RolePermission::CONFIGURABLE_ROLES as $role) {
            $roles[$role] = \App\Models\RoleAbility::getForRole($role);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'registry' => \App\Models\RoleAbility::registry(),
                'roles'    => $roles,
            ],
        ]);
    }

    /**
     * Replace a role's granted abilities with the provided set (admin-editable).
     */
    public function updateAbilities(Request $request, string $role): JsonResponse
    {
        if (!in_array($role, RolePermission::CONFIGURABLE_ROLES)) {
            return response()->json(['success' => false, 'message' => 'Invalid or non-configurable role.'], 422);
        }

        $validated = $request->validate([
            'abilities'   => 'present|array',
            'abilities.*' => 'string',
        ]);

        // Only accept abilities that exist in the registry — reject typos/unknown verbs.
        $known = array_keys(\App\Models\RoleAbility::registry());
        $requested = array_values(array_unique(array_intersect($validated['abilities'], $known)));

        $old = \App\Models\RoleAbility::getForRole($role);

        \Illuminate\Support\Facades\DB::transaction(function () use ($role, $requested) {
            \App\Models\RoleAbility::where('role', $role)->delete();
            foreach ($requested as $ability) {
                \App\Models\RoleAbility::create(['role' => $role, 'ability' => $ability]);
            }
        });

        \App\Models\RoleAbility::flushCache($role);

        AuditLogService::log(
            action: 'UPDATE_ROLE_ABILITIES',
            module: 'admin',
            entityType: 'role_ability',
            entityId: null,
            old: ['role' => $role, 'abilities' => $old],
            new: ['role' => $role, 'abilities' => $requested]
        );

        return response()->json([
            'success' => true,
            'data'    => $requested,
            'message' => "Abilities for '{$role}' updated.",
        ]);
    }
}
