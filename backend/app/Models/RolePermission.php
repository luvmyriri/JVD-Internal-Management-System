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

    /** All top-level modules that can be permissioned. */
    public const MODULES = [
        'dashboard'      => 'Dashboard',
        'accounting'     => 'Accounting',
        'operations'     => 'Operations',
        'logistics'      => 'Logistics',
        'procurement'    => 'Procurement',
        'accreditations' => 'Accreditations',
        'inventory'      => 'Inventory',
        'fleet'          => 'Fleet',
        'travel'         => 'Travel',
        'hr'             => 'HR & Employees',
        'admin'          => 'Administration',
        'settings'       => 'System Settings',
        'driver'         => 'Driver Operations',
    ];

    /**
     * Page-level map: module => [ 'module.page_key' => 'Display Label' ]
     * These keys are stored in the same `module` column using dot-notation.
     */
    public const PAGES = [
        'dashboard' => [],   // Single page — no sub-pages

        'accounting' => [
            'accounting.pos'      => 'POS',
            'accounting.billing'  => 'Billing',
            'accounting.reports'  => 'Reports',
        ],

        'operations' => [
            'operations.trip_tickets'  => 'Trip Tickets',
            'operations.commissions'   => 'Commissions',
            'operations.collections'   => 'Collections',
            'operations.cash_budgets'  => 'Cash Budgets',
        ],

        'logistics' => [
            'logistics.overview' => 'Overview',
        ],

        'procurement' => [
            'procurement.work_orders'    => 'Work Orders',
            'procurement.job_orders'     => 'Job Orders',
            'procurement.purchase_orders'=> 'Purchase Orders',
            'procurement.suppliers'      => 'Suppliers',
            'procurement.accreditations' => 'Accreditations',
            'procurement.documents'      => 'Documents',
        ],

        'accreditations' => [],  // Shown under procurement in sidebar

        'inventory' => [
            'inventory.supplies' => 'Supplies',
            'inventory.fleet'    => 'Fleet',
            'inventory.pms'      => 'PMS',
        ],

        'fleet' => [],  // Managed under inventory

        'travel' => [
            'travel.passporting'     => 'Passporting',
            'travel.visa_processing' => 'Visa Processing',
            'travel.customers'       => 'Customers',
            'travel.documents'       => 'Documents',
        ],

        'hr' => [
            'hr.employees'    => 'Employees',
            'hr.applications' => 'Applications',
            'hr.internships'  => 'Internships',
        ],

        'admin' => [
            'admin.users'      => 'Users',
            'admin.audit_logs' => 'Audit Logs',
            'admin.settings'   => 'Settings',
        ],

        'settings' => [],  // Managed under admin

        'driver' => [
            'driver.schedule' => 'My Schedule',
            'driver.trips'    => 'My Trips',
            'driver.bus'      => 'My Bus',
        ],
    ];

    /** Returns ALL permission keys (modules + pages) as a flat list. */
    public static function allKeys(): array
    {
        $keys = array_keys(self::MODULES);
        foreach (self::PAGES as $pages) {
            $keys = array_merge($keys, array_keys($pages));
        }
        return $keys;
    }

    /** Roles that can have configurable permissions. Super Admin always bypasses. */
    public const CONFIGURABLE_ROLES = [
        'admin',
        'executive_vice_president',
        'human_resource',
        'accounting',
        'agent',
        'driver',
        'operations_manager',
        'reservation_officer',
        'office_staff',
        'accounting_executive',
        'corporate_secretary',
        'logistics_in_charge',
        'dispatcher',
        'purchasing_manager',
        'service_adviser',
        'head_mechanic',
    ];

    // ──────────────────────────────────────────
    // Permission resolution (cached)
    // ──────────────────────────────────────────

    /**
     * Get all permissions for a role, indexed by key (module or module.page).
     * Results are cached for 5 minutes per role.
     *
     * @return array<string, array{can_view: bool, can_create: bool, can_edit: bool, can_delete: bool}>
     */
    public static function getForRole(string $role): array
    {
        // Super admin always has full access — never check the DB
        if ($role === 'super_admin') {
            $full = [];
            foreach (self::allKeys() as $key) {
                $full[$key] = [
                    'can_view'   => true,
                    'can_create' => true,
                    'can_edit'   => true,
                    'can_delete' => true,
                ];
            }
            return $full;
        }

        return Cache::remember("role_permissions:{$role}", 300, function () use ($role) {
            $perms = self::where('role', $role)->get()->keyBy('module');

            $map = [];
            foreach (self::allKeys() as $key) {
                $p = $perms->get($key);
                $map[$key] = [
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
     * Check if a role has a specific permission on a module or page key.
     */
    public static function roleHasPermission(string $role, string $key, string $action = 'can_view'): bool
    {
        $perms = self::getForRole($role);
        return $perms[$key][$action] ?? false;
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
        // Also flush super_admin just in case
        Cache::forget('role_permissions:super_admin');
    }
}
