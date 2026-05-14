<?php

namespace Database\Seeders;

use App\Models\Bus;
use Illuminate\Database\Seeder;

class BusSeeder extends Seeder
{
    public function run(): void
    {
        $buses = [
            [
                'plate_number' => 'NBC 1234',
                'model' => 'Hino RK8J',
                'seating_capacity' => 45,
                'status' => 'available',
                'last_service_date' => now()->subMonths(1),
            ],
            [
                'plate_number' => 'XYZ 5678',
                'model' => 'Yutong ZK6122H9',
                'seating_capacity' => 49,
                'status' => 'in_service',
                'last_service_date' => now()->subWeeks(2),
            ],
            [
                'plate_number' => 'ABC 9012',
                'model' => 'King Long XMQ6127',
                'seating_capacity' => 51,
                'status' => 'under_maintenance',
                'last_service_date' => now()->subDays(3),
            ],
        ];

        foreach ($buses as $bus) {
            Bus::create($bus);
        }
    }
}
