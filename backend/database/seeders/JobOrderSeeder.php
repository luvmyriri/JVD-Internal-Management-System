<?php

namespace Database\Seeders;

use App\Models\JobOrder;
use App\Models\User;

use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        $jhune = User::where('role', 'super_admin')->first();
        $arnold = User::where('email', 'arnold@jvd.com')->first();
        $customer = \App\Models\Customer::first();
        
        $bus1 = \App\Models\Bus::where('plate_number', 'ABC-1234')->first();
        $bus2 = \App\Models\Bus::where('plate_number', 'LMN-9101')->first();
        $wo = \App\Models\WorkOrder::where('wo_number', 'WO-2026-001')->first();
        
        if (!$jhune || !$arnold || !$customer || !$bus1 || !$bus2 || !$wo) return;

        // JO-2026-101 is the maintenance Job Order generated from Work Order WO-2026-001
        $joMaintenance = JobOrder::create([
            'jo_number' => 'JO-2026-101',
            'customer_id' => null,
            'bus_id' => $bus1->id,
            'work_order_id' => $wo->id,
            'created_by' => $jhune->id,
            'requested_by' => $arnold->id,
            'service_type' => 'maintenance',
            'service_date' => now()->subDays(3),
            'destination' => 'JVD Maintenance Workshop',
            'total_cost' => 4500.00,
            'status' => 'confirmed',
            'notes' => 'Mechanic Arnold Navero assigned to execute brake pad overhaul.',
        ]);

        // Job order line items representing labor and parts needed
        \App\Models\JobOrderItem::create([
            'job_order_id' => $joMaintenance->id,
            'item_no' => 'ITM-001',
            'item_description' => 'Brake Pads Replacement (Front)',
            'quantity' => 2,
            'unit_cost' => 1200.00,
            'amount' => 2400.00,
        ]);
        
        \App\Models\JobOrderItem::create([
            'job_order_id' => $joMaintenance->id,
            'item_no' => 'ITM-002',
            'item_description' => 'Brake Pads Replacement (Rear)',
            'quantity' => 2,
            'unit_cost' => 900.00,
            'amount' => 1800.00,
        ]);
        
        \App\Models\JobOrderItem::create([
            'job_order_id' => $joMaintenance->id,
            'item_no' => 'LBR-001',
            'item_description' => 'Wheel Alignment & Labor',
            'quantity' => 1,
            'unit_cost' => 300.00,
            'amount' => 300.00,
        ]);

        // Customer-facing Travel Job Orders
        JobOrder::create([
            'jo_number' => 'JO-2026-001',
            'customer_id' => $customer->id,
            'bus_id' => $bus2->id,
            'created_by' => $jhune->id,
            'service_type' => 'bus_rental',
            'service_date' => now()->addDays(5),
            'destination' => 'Baguio City Tour',
            'total_cost' => 25000.00,
            'status' => 'confirmed',
            'notes' => 'Corporate weekend outing for client staff.',
        ]);

        JobOrder::create([
            'jo_number' => 'JO-2026-002',
            'customer_id' => $customer->id,
            'bus_id' => $bus2->id,
            'created_by' => $jhune->id,
            'service_type' => 'field_trip',
            'service_date' => now()->addDays(12),
            'destination' => 'Enchanted Kingdom',
            'total_cost' => 18000.00,
            'status' => 'created',
            'notes' => 'Local elementary school field trip.',
        ]);
    }
}
