<?php

namespace Database\Seeders;

use App\Models\JobOrder;
use App\Models\User;

use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?? User::first();
        $customer = \App\Models\Customer::first();
        $bus = \App\Models\Bus::first();
        if (!$admin || !$customer || !$bus) return;

        $orders = [
            [
                'jo_number' => 'JO-2024-001',
                'customer_id' => $customer->id,
                'bus_id' => $bus->id,
                'created_by' => $admin->id,
                'service_type' => 'bus_rental',
                'service_date' => now()->addDays(5),
                'destination' => 'Baguio City',
                'total_cost' => 25000.00,
                'status' => 'confirmed',
            ],
            [
                'jo_number' => 'JO-2026-001',
                'customer_id' => $customer->id,
                'bus_id' => $bus->id,
                'service_type' => 'bus_rental',
                'service_date' => now()->addDays(5),
                'destination' => 'Tagaytay City',
                'total_cost' => 15000.00,
                'status' => 'confirmed',
                'created_by' => $admin->id,
                'notes' => 'Regular rental for corporate event.',
            ],
            [
                'jo_number' => 'JO-2026-002',
                'customer_id' => $customer->id,
                'bus_id' => $bus->id,
                'service_type' => 'field_trip',
                'service_date' => now()->addDays(10),
                'destination' => 'Enchanted Kingdom',
                'total_cost' => 25000.00,
                'status' => 'created',
                'created_by' => $admin->id,
                'notes' => 'School field trip booking.',
            ],
        ];

        foreach ($orders as $order) {
            JobOrder::create($order);
        }

    }
}
