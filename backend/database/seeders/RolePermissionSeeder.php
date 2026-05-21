<?php

namespace Database\Seeders;

use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default permission matrix matching the current hardcoded route middleware.
     * Format: [module => [role => [can_view, can_create, can_edit, can_delete]]]
     */
    private const DEFAULTS = [
        'dashboard' => [
            'admin'          => [true,  false, false, false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [false, false, false, false],
            'driver'         => [false, false, false, false],
        ],
        'accounting' => [
            'admin'          => [false, false, false, false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [true,  true,  true,  true],
            'agent'          => [true,  true,  true,  true],
            'driver'         => [false, false, false, false],
        ],
        'procurement' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [true,  true,  true,  false],
            'agent'          => [true,  true,  true,  false],
            'driver'         => [false, false, false, false],
        ],
        'operations' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [true,  true,  true,  false],
            'driver'         => [false, false, false, false],
        ],
        'accreditations' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [true,  true,  true,  false],
            'driver'         => [false, false, false, false],
        ],
        'inventory' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [true,  false, false, false],
            'agent'          => [true,  true,  true,  false],
            'driver'         => [false, false, false, false],
        ],
        'fleet' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [true,  false, false, false],
            'driver'         => [false, false, false, false],
        ],
        'travel' => [
            'admin'          => [true,  true,  true,  true],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [true,  true,  true,  true],
            'driver'         => [false, false, false, false],
        ],
        'hr' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [true,  true,  true,  false],
            'accounting'     => [false, false, false, false],
            'agent'          => [false, false, false, false],
            'driver'         => [false, false, false, false],
        ],
        'admin' => [
            'admin'          => [true,  true,  true,  false],
            'human_resource' => [true,  false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [false, false, false, false],
            'driver'         => [false, false, false, false],
        ],
        'settings' => [
            'admin'          => [true,  false, true,  false],
            'human_resource' => [false, false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [false, false, false, false],
            'driver'         => [false, false, false, false],
        ],
        'driver' => [
            'admin'          => [true,  true,  true,  true],
            'human_resource' => [true,  false, false, false],
            'accounting'     => [false, false, false, false],
            'agent'          => [false, false, false, false],
            'driver'         => [true,  false, false, false],
        ],
    ];

    public function run(): void
    {
        foreach (self::DEFAULTS as $module => $roles) {
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

        // Flush cache after seeding
        RolePermission::flushAllCache();

        $this->command->info('Role permissions seeded successfully.');
    }
}
