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
            [
                'wo_number' => 'WO-2024-003',
                'bus_id' => 3,
                'created_by' => $admin->id,
                'description' => 'Aircon cleaning and filter replacement',
                'priority' => 'routine',
                'status' => 'completed',
            ],
            [
                'wo_number' => 'WO-2024-004',
                'bus_id' => 4,
                'created_by' => $admin->id,
                'description' => 'Oil change and fluid check',
                'priority' => 'routine',
                'status' => 'open',
            ],
            [
                'wo_number' => 'WO-2024-005',
                'bus_id' => 2,
                'created_by' => $admin->id,
                'description' => 'Electrical system diagnostic',
                'priority' => 'critical',
                'status' => 'pending_approval',
            ],
        ];

        foreach ($orders as $order) {
            WorkOrder::create($order);
        }
    }
}
