<?php

namespace Database\Seeders;

use App\Models\JobOrder;
use App\Models\User;
use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $orders = [
            [
                'jo_number' => 'JO-2024-001',
                'customer_id' => 1,
                'bus_id' => 1,
                'created_by' => $admin->id,
                'service_type' => 'bus_rental',
                'service_date' => now()->addDays(5),
                'destination' => 'Baguio City',
                'total_cost' => 25000.00,
                'status' => 'confirmed',
            ],
            [
                'jo_number' => 'JO-2024-002',
                'customer_id' => 2,
                'bus_id' => 3,
                'created_by' => $admin->id,
                'service_type' => 'corporate_transport',
                'service_date' => now()->addDays(10),
                'destination' => 'Clark Freeport Zone',
                'total_cost' => 15000.00,
                'status' => 'created',
            ],
        ];

        foreach ($orders as $order) {
            JobOrder::create($order);
        }
    }
}
