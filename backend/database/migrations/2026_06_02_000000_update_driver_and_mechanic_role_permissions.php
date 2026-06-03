<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\RolePermission;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissions = [
            // Driver permissions
            [
                'role' => 'driver',
                'module' => 'operations',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => false,
                'can_delete' => false,
            ],
            [
                'role' => 'driver',
                'module' => 'operations.commissions',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => false,
                'can_delete' => false,
            ],
            [
                'role' => 'driver',
                'module' => 'procurement',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => false,
                'can_delete' => false,
            ],
            [
                'role' => 'driver',
                'module' => 'procurement.work_orders',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => false,
                'can_delete' => false,
            ],
            
            // Head Mechanic permissions
            [
                'role' => 'head_mechanic',
                'module' => 'operations',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => true,
                'can_delete' => false,
            ],
            [
                'role' => 'head_mechanic',
                'module' => 'operations.commissions',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => true,
                'can_delete' => false,
            ],
            [
                'role' => 'head_mechanic',
                'module' => 'procurement',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => true,
                'can_delete' => false,
            ],
            [
                'role' => 'head_mechanic',
                'module' => 'procurement.work_orders',
                'can_view' => true,
                'can_create' => true,
                'can_edit' => true,
                'can_delete' => false,
            ],
        ];

        foreach ($permissions as $perm) {
            DB::table('role_permissions')->updateOrInsert(
                ['role' => $perm['role'], 'module' => $perm['module']],
                [
                    'can_view' => $perm['can_view'],
                    'can_create' => $perm['can_create'],
                    'can_edit' => $perm['can_edit'],
                    'can_delete' => $perm['can_delete'],
                    'updated_at' => now(),
                ]
            );
        }

        // Flush Cache
        if (class_exists(RolePermission::class)) {
            RolePermission::flushAllCache();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert permissions
        $keys = [
            ['driver', 'operations'],
            ['driver', 'operations.commissions'],
            ['driver', 'procurement'],
            ['driver', 'procurement.work_orders'],
            ['head_mechanic', 'operations'],
            ['head_mechanic', 'operations.commissions'],
            ['head_mechanic', 'procurement'],
            ['head_mechanic', 'procurement.work_orders'],
        ];

        foreach ($keys as [$role, $module]) {
            DB::table('role_permissions')
                ->where('role', $role)
                ->where('module', $module)
                ->delete();
        }

        if (class_exists(RolePermission::class)) {
            RolePermission::flushAllCache();
        }
    }
};
