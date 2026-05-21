<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class RolePermission extends Model
{
    protected $fillable = [
        'role',
        'module',
        'can_view',
        'can_create',
        'can_edit',
        'can_delete',
    ];

    protected function casts(): array
    {
        return [
            'can_view'   => 'boolean',
            'can_create' => 'boolean',
            'can_edit'   => 'boolean',
            'can_delete' => 'boolean',
        ];
    }

    // ──────────────────────────────────────────
    // Module & Role constants
    // ──────────────────────────────────────────

    /** All modules in the system that can be permissioned. */
    public const MODULES = [
        'dashboard'      => 'Dashboard',
        'accounting'     => 'Accounting',
        'procurement'    => 'Procurement',
        'operations'     => 'Operations',
        'accreditations' => 'Accreditations',
        'inventory'      => 'Inventory',
        'fleet'          => 'Fleet',
        'travel'         => 'Travel',
        'hr'             => 'HR & Employees',
        'admin'          => 'Administration',
        'settings'       => 'System Settings',
        'driver'         => 'Driver Operations',
    ];

    /** Roles that can have configurable permissions. Super Admin always bypasses. */
    public const CONFIGURABLE_ROLES = [
        'admin',
        'human_resource',
        'accounting',
        'agent',
        'driver',
    ];

    // ──────────────────────────────────────────
    // Permission resolution (cached)
    // ──────────────────────────────────────────

    /**
     * Get all permissions for a role, indexed by module.
     * Results are cached for 5 minutes per role.
     *
     * @return array<string, array{can_view: bool, can_create: bool, can_edit: bool, can_delete: bool}>
     */
    public static function getForRole(string $role): array
    {
        // Super admin always has full access — never check the DB
        if ($role === 'super_admin') {
            $full = [];
            foreach (array_keys(self::MODULES) as $module) {
                $full[$module] = [
                    'can_view'   => true,
                    'can_create' => true,
                    'can_edit'   => true,
                    'can_delete' => true,
                ];
            }
            return $full;
        }

        return Cache::remember("role_permissions:{$role}", 300, function () use ($role) {
            $perms = self::where('role', $role)->get();

            $map = [];
            foreach (array_keys(self::MODULES) as $module) {
                $p = $perms->firstWhere('module', $module);
                $map[$module] = [
                    'can_view'   => $p?->can_view ?? false,
                    'can_create' => $p?->can_create ?? false,
                    'can_edit'   => $p?->can_edit ?? false,
                    'can_delete' => $p?->can_delete ?? false,
                ];
            }
            return $map;
        });
    }

    /**
     * Check if a role has a specific permission on a module.
     */
    public static function roleHasPermission(string $role, string $module, string $action = 'can_view'): bool
    {
        $perms = self::getForRole($role);
        return $perms[$module][$action] ?? false;
    }

    /**
     * Flush the permission cache for a role (call after updates).
     */
    public static function flushCache(string $role): void
    {
        Cache::forget("role_permissions:{$role}");
    }

    /**
     * Flush all cached permissions.
     */
    public static function flushAllCache(): void
    {
        foreach (self::CONFIGURABLE_ROLES as $role) {
            self::flushCache($role);
        }
    }
}
