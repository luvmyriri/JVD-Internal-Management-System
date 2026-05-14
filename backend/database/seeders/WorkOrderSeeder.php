<?php

namespace Database\Seeders;

use App\Models\WorkOrder;
use App\Models\User;
use Illuminate\Database\Seeder;

class WorkOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $orders = [
            [
                'wo_number' => 'WO-2024-001',
                'bus_id' => 1,
                'created_by' => $admin->id,
                'description' => 'Engine Overhaul and Preventive Maintenance',
                'priority' => 'critical',
                'status' => 'in_progress',
            ],
            [
                'wo_number' => 'WO-2024-002',
                'bus_id' => 2,
                'created_by' => $admin->id,
                'description' => 'Brake pad replacement and tire rotation',
                'priority' => 'urgent',
                'status' => 'open',
            ],
        ];

        foreach ($orders as $order) {
            WorkOrder::create($order);
        }
    }
}
