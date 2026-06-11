<?php

namespace Database\Seeders;

use App\Models\WorkOrder;
use App\Models\User;

use Illuminate\Database\Seeder;

class WorkOrderSeeder extends Seeder
{
    public function run(): void
    {
        $minda = User::where('email', 'minda@jvd.com')->first();
        $arnold = User::where('email', 'arnold@jvd.com')->first();
        $jhune = User::where('email', 'jhune@jvd.com')->first();
        
        $bus1 = \App\Models\Bus::where('plate_number', 'NGA 3628')->first();
        $bus2 = \App\Models\Bus::where('plate_number', 'NKG 4030')->first();
        
        if (!$minda || !$arnold || !$jhune || !$bus1 || !$bus2) return;

        $orders = [
            [
                'wo_number' => 'WO-2026-001',
                'bus_id' => $bus1->id,
                'created_by' => $minda->id,
                'assigned_to' => $arnold->id,
                'approved_by' => $jhune->id,
                'approved_at' => now()->subDays(5),
                'approval_notes' => 'Approved for immediate execution.',
                'description' => 'Brake pads wearing thin, replace front and rear pads and rotate tires.',
                'priority' => 'urgent',
                'status' => 'open',
                'cost' => 4500.00,
                'auto_generated' => false,
            ],
            [
                'wo_number' => 'WO-2026-002',
                'bus_id' => $bus2->id,
                'created_by' => $minda->id,
                'assigned_to' => $arnold->id,
                'description' => 'Check check-engine light and diagnose overheating issue.',
                'priority' => 'critical',
                'status' => 'pending_approval',
                'cost' => 0.00,
                'auto_generated' => false,
            ],
        ];

        foreach ($orders as $order) {
            WorkOrder::create($order);
        }
    }
}
