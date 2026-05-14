<?php

namespace Database\Seeders;

use App\Models\WorkOrder;
use App\Models\User;

use Illuminate\Database\Seeder;

class WorkOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?? User::first();
        $bus = \App\Models\Bus::first();
        if (!$admin || !$bus) return;

        $orders = [
            [
                'wo_number' => 'WO-2024-001',
                'bus_id' => $bus->id,
                'created_by' => $admin->id,
                'description' => 'Engine Overhaul and Preventive Maintenance',
                'priority' => 'critical',
                'status' => 'in_progress',
            ],
            [
                'wo_number' => 'WO-2024-002',
                'bus_id' => \App\Models\Bus::skip(1)->first()?->id ?? $bus->id,
                'created_by' => $admin->id,
                'description' => 'Brake pad replacement and tire rotation',
                'priority' => 'urgent',
                'status' => 'open',
            ],
            [
                'wo_number' => 'WO-2026-001',
                'bus_id' => $bus->id,
                'description' => 'Annual safety inspection and fleet-wide checkup.',
                'status' => 'open',
                'priority' => 'routine',
                'created_by' => $admin->id,
            ],
            [
                'wo_number' => 'WO-2026-002',
                'bus_id' => $bus->id,
                'description' => 'Urgent engine overheating issue.',
                'status' => 'in_progress',
                'priority' => 'critical',
                'created_by' => $admin->id,
            ],
        ];

        foreach ($orders as $order) {
            WorkOrder::create($order);
        }

    }
}
