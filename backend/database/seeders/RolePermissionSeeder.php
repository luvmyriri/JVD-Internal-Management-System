<?php

namespace Database\Seeders;

use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default module-level permission matrix.
     * Format: [module => [role => [can_view, can_create, can_edit, can_delete]]]
     *
     * Page-level permissions are derived from these module defaults automatically.
     *
     * Roles (position-based):
     *   super_admin           — bypasses all checks (never stored)
     *   executive_vice_president — full access, no override
     *   operations_manager
     *   reservation_officer
     *   office_staff
     *   accounting_executive
     *   corporate_secretary
     *   logistics_in_charge
     *   dispatcher (Booking Officer/Dispatcher)
     *   purchasing_manager
     *   head_mechanic
     *   service_adviser
     *   driver (Coach Captain)
     */
    private const MODULE_DEFAULTS = [
        // ─── Management Overview ───
        'dashboard' => [
            'executive_vice_president' => [true,  false, false, false],
            'operations_manager'       => [true,  false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [true,  false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Accounting (Billing, Reports, Collections, Cash Budgets, Commissions) ───
        'accounting' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [true,  true,  true,  true],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Operations (Customers, Accreditations, Company Documents) ───
        'operations' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [true,  true,  true,  false],
            'reservation_officer'      => [true,  true,  true,  false],
            'office_staff'             => [true,  true,  true,  false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [true,  true,  true,  false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Logistics (Overview, Trip Ticket, Fleet, PMS) ───
        'logistics' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [true,  true,  true,  true],
            'dispatcher'               => [true,  true,  true,  false],
            'purchasing_manager'       => [true,  false, false, false],
            'head_mechanic'            => [true,  true,  true,  false],
            'service_adviser'          => [true,  true,  false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Procurement (W.O, J.O, P.O, Suppliers) ───
        'procurement' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [true,  true,  true,  false],
            'purchasing_manager'       => [true,  true,  true,  true],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [true,  true,  false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Inventory (Supplies) ───
        'inventory' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [true,  true,  true,  false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Sales (Fixed Packages, Custom Client Transactions) ───
        'sales' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [true,  true,  true,  false],
            'office_staff'             => [true,  true,  true,  false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Human Resource (Employees, Job Applications, Internship, Payroll) ───
        'hr' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [true,  true,  true,  false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [true,  true,  true,  false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Driver (Overview, Scheduled Trips, My Fleet) ───
        'driver' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [true,  false, false, false],
            'dispatcher'               => [true,  false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [true,  true,  false, false],
        ],

        // ─── Travel Assistance (Passporting, Visa Processing) ───
        'travel' => [
            'executive_vice_president' => [true,  true,  true,  true],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [true,  true,  true,  false],
            'office_staff'             => [true,  true,  true,  false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],

        // ─── Administration (Users, Role Permissions, Audit Logs, Settings) ───
        'admin' => [
            'executive_vice_president' => [true,  true,  true,  false],
            'operations_manager'       => [false, false, false, false],
            'reservation_officer'      => [false, false, false, false],
            'office_staff'             => [false, false, false, false],
            'accounting_executive'     => [false, false, false, false],
            'corporate_secretary'      => [false, false, false, false],
            'logistics_in_charge'      => [false, false, false, false],
            'dispatcher'               => [false, false, false, false],
            'purchasing_manager'       => [false, false, false, false],
            'head_mechanic'            => [false, false, false, false],
            'service_adviser'          => [false, false, false, false],
            'driver'                   => [false, false, false, false],
        ],
    ];

    /**
     * Page-level overrides: when a specific page permission should differ
     * from its parent module default.
     *
     * Format: [page_key => [role => [can_view, can_create, can_edit, can_delete]]]
     * Only roles that differ from the parent module default need to be listed.
     */
    private const PAGE_OVERRIDES = [
        // Operations Manager sees Collections & Cash Budgets & Commissions under Accounting
        'accounting.collections' => [
            'operations_manager' => [true,  true,  true,  false],
        ],
        'accounting.cash_budgets' => [
            'operations_manager' => [true,  true,  true,  false],
        ],
        'accounting.commissions' => [
            'operations_manager' => [true,  true,  true,  false],
            'reservation_officer'=> [true,  true,  true,  false],
            'office_staff'       => [true,  true,  true,  false],
            'corporate_secretary'=> [true,  true,  true,  false],
            'logistics_in_charge'=> [true,  true,  true,  false],
            'dispatcher'         => [true,  true,  true,  false],
            'purchasing_manager' => [true,  true,  true,  false],
            'head_mechanic'      => [true,  true,  true,  false],
            'service_adviser'    => [true,  true,  true,  false],
            'driver'             => [true,  true,  true,  false],
        ],

        // Logistics page-level overrides
        'logistics.overview' => [
            'head_mechanic' => [true, false, false, false],  // List of requests from Coach Captains
        ],
        'logistics.trip_tickets' => [
            'head_mechanic'    => [false, false, false, false],
            'service_adviser'  => [false, false, false, false],
        ],
        'logistics.fleet' => [
            'purchasing_manager' => [true,  false, false, false],
        ],
        'logistics.pms' => [
            'purchasing_manager' => [true,  true,  true,  false],
            'service_adviser'    => [false, false, false, false],
        ],

        // Procurement page-level overrides
        'procurement.job_orders' => [
            'dispatcher' => [false, false, false, false],
        ],
        'procurement.purchase_orders' => [
            'dispatcher'      => [false, false, false, false],
            'service_adviser' => [false, false, false, false],
        ],
        'procurement.suppliers' => [
            'dispatcher'      => [false, false, false, false],
            'service_adviser' => [false, false, false, false],
        ],

        // Admin — Role Permissions is super_admin only (EVP can't access)
        'admin.role_permissions' => [
            'executive_vice_president' => [false, false, false, false],
        ],
    ];

    public function run(): void
    {
        // 1. Seed module-level permissions
        foreach (self::MODULE_DEFAULTS as $module => $roles) {
            foreach ($roles as $role => [$view, $create, $edit, $delete]) {
                RolePermission::updateOrCreate(
                    ['role' => $role, 'module' => $module],
                    [
                        'can_view'   => $view,
                        'can_create' => $create,
                        'can_edit'   => $edit,
                        'can_delete' => $delete,
                    ]
                );
            }
        }

        // 2. Seed page-level permissions — inherit from the parent module defaults
        foreach (RolePermission::PAGES as $parentModule => $pages) {
            if (empty($pages)) continue;

            $moduleDefaults = self::MODULE_DEFAULTS[$parentModule] ?? [];

            foreach ($pages as $pageKey => $pageLabel) {
                $pageOverrides = self::PAGE_OVERRIDES[$pageKey] ?? [];

                foreach ($moduleDefaults as $role => [$view, $create, $edit, $delete]) {
                    // Apply page-level override if it exists
                    if (isset($pageOverrides[$role])) {
                        [$view, $create, $edit, $delete] = $pageOverrides[$role];
                    }

                    RolePermission::updateOrCreate(
                        ['role' => $role, 'module' => $pageKey],
                        [
                            'can_view'   => $view,
                            'can_create' => $create,
                            'can_edit'   => $edit,
                            'can_delete' => $delete,
                        ]
                    );
                }
            }
        }

        // 3. Clean up orphaned permissions for removed modules/pages
        $validKeys = RolePermission::allKeys();
        RolePermission::whereNotIn('module', $validKeys)->delete();

        // 4. Clean up permissions for removed generic roles
        $removedRoles = ['admin', 'accounting', 'agent', 'human_resource'];
        RolePermission::whereIn('role', $removedRoles)->delete();

        // Flush all caches after seeding
        RolePermission::flushAllCache();

        $this->command->info('Role permissions (module + page level) seeded successfully.');
    }
}
