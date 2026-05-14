<?php

namespace Database\Seeders;

use App\Models\JobOrder;
use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        $customer = \App\Models\Customer::first();
        $bus = \App\Models\Bus::first();
        $user = \App\Models\User::first();

        if (!$customer || !$bus || !$user) return;

        JobOrder::create([
            'jo_number' => 'JO-2026-001',
            'customer_id' => $customer->id,
            'bus_id' => $bus->id,
            'service_type' => 'bus_rental',
            'service_date' => now()->addDays(5),
            'destination' => 'Tagaytay City',
            'total_cost' => 15000.00,
            'status' => 'confirmed',
            'created_by' => $user->id,
            'notes' => 'Regular rental for corporate event.',
        ]);

        JobOrder::create([
            'jo_number' => 'JO-2026-002',
            'customer_id' => $customer->id,
            'bus_id' => $bus->id,
            'service_type' => 'field_trip',
            'service_date' => now()->addDays(10),
            'destination' => 'Enchanted Kingdom',
            'total_cost' => 25000.00,
            'status' => 'created',
            'created_by' => $user->id,
            'notes' => 'School field trip booking.',
        ]);
    }
}
