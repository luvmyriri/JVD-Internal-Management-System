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
     */
    private const MODULE_DEFAULTS = [
        'dashboard' => [
            'admin'                => [true,  false, false, false],
            'executive_vice_president' => [true, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [false, false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  false, false, false],
            'reservation_officer'  => [false, false, false, false],
            'office_staff'         => [false, false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  false, false, false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'accounting' => [
            'admin'                => [false, false, false, false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [true,  true,  true,  true],
            'agent'                => [true,  true,  true,  true],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [false, false, false, false],
            'reservation_officer'  => [true,  true,  true,  true],
            'office_staff'         => [true,  true,  true,  true],
            'accounting_executive' => [true,  true,  true,  true],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [false, false, false, false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'operations' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [true, true, true, true],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [true,  true,  true,  false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  true,  true,  false],
            'office_staff'         => [true,  true,  true,  false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  false],
            'dispatcher'           => [true,  true,  true,  false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'logistics' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [true,  false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  false, false, false],
            'office_staff'         => [true,  false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  true],
            'dispatcher'           => [true,  true,  true,  false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'procurement' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [true,  true,  true,  false],
            'agent'                => [true,  true,  true,  false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  true,  true,  false],
            'office_staff'         => [true,  true,  true,  false],
            'accounting_executive' => [true,  true,  true,  false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  false],
            'dispatcher'           => [true,  true,  true,  false],
            'purchasing_manager'   => [true,  true,  true,  true],
            'service_adviser'      => [true,  true,  false, false],
            'head_mechanic'        => [true,  true,  false, false],
        ],
        'accreditations' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [true,  true,  true,  false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  true,  true,  false],
            'office_staff'         => [true,  true,  true,  false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'inventory' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [true, true, true, true],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [true,  false, false, false],
            'agent'                => [true,  true,  true,  false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  true,  true,  false],
            'office_staff'         => [true,  true,  true,  false],
            'accounting_executive' => [true,  false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  false],
            'dispatcher'           => [true,  false, false, false],
            'purchasing_manager'   => [true,  true,  true,  false],
            'service_adviser'      => [true,  true,  true,  false],
            'head_mechanic'        => [true,  true,  true,  false],
        ],
        'fleet' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [true, true, true, true],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [true,  false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  false],
            'reservation_officer'  => [true,  false, false, false],
            'office_staff'         => [true,  false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  false],
            'dispatcher'           => [true,  false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [true,  true,  true,  false],
            'head_mechanic'        => [true,  true,  true,  false],
        ],
        'travel' => [
            'admin'                => [true,  true,  true,  true],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [true,  true,  true,  true],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [true,  true,  true,  true],
            'reservation_officer'  => [true,  true,  true,  true],
            'office_staff'         => [true,  true,  true,  true],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [true,  true,  true,  true],
            'dispatcher'           => [true,  true,  true,  true],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'hr' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [true, true, true, true],
            'human_resource'       => [true,  true,  true,  false],
            'accounting'           => [false, false, false, false],
            'agent'                => [false, false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [false, false, false, false],
            'reservation_officer'  => [false, false, false, false],
            'office_staff'         => [false, false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [true,  true,  true,  false],
            'logistics_in_charge'  => [false, false, false, false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'admin' => [
            'admin'                => [true,  true,  true,  false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [true,  false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [false, false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [false, false, false, false],
            'reservation_officer'  => [false, false, false, false],
            'office_staff'         => [false, false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [true,  false, false, false],
            'logistics_in_charge'  => [false, false, false, false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'settings' => [
            'admin'                => [true,  false, true,  false],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [false, false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [false, false, false, false],
            'driver'               => [false, false, false, false],
            'operations_manager'   => [false, false, false, false],
            'reservation_officer'  => [false, false, false, false],
            'office_staff'         => [false, false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [false, false, false, false],
            'logistics_in_charge'  => [false, false, false, false],
            'dispatcher'           => [false, false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
        ],
        'driver' => [
            'admin'                => [true,  true,  true,  true],
            'executive_vice_president' => [false, false, false, false],
            'human_resource'       => [true,  false, false, false],
            'accounting'           => [false, false, false, false],
            'agent'                => [false, false, false, false],
            'driver'               => [true,  false, false, false],
            'operations_manager'   => [true,  false, false, false],
            'reservation_officer'  => [false, false, false, false],
            'office_staff'         => [false, false, false, false],
            'accounting_executive' => [false, false, false, false],
            'corporate_secretary'  => [true,  false, false, false],
            'logistics_in_charge'  => [true,  false, false, false],
            'dispatcher'               => [true,  false, false, false],
            'purchasing_manager'   => [false, false, false, false],
            'service_adviser'      => [false, false, false, false],
            'head_mechanic'        => [false, false, false, false],
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
                foreach ($moduleDefaults as $role => [$view, $create, $edit, $delete]) {
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

        // Flush all caches after seeding
        RolePermission::flushAllCache();

        $this->command->info('Role permissions (module + page level) seeded successfully.');
    }
}
