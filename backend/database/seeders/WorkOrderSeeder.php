<?php

namespace Database\Seeders;

use App\Models\WorkOrder;
use Illuminate\Database\Seeder;

class WorkOrderSeeder extends Seeder
{
    public function run(): void
    {
        $bus = \App\Models\Bus::first();
        $user = \App\Models\User::first();

        if (!$bus || !$user) return;

        WorkOrder::create([
            'wo_number' => 'WO-2026-001',
            'bus_id' => $bus->id,
            'description' => 'Annual safety inspection and fleet-wide checkup.',
            'status' => 'open',
            'priority' => 'routine',
            'created_by' => $user->id,
        ]);

        WorkOrder::create([
            'wo_number' => 'WO-2026-002',
            'bus_id' => $bus->id,
            'description' => 'Urgent engine overheating issue.',
            'status' => 'in_progress',
            'priority' => 'critical',
            'created_by' => $user->id,
        ]);
    }
}
