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
                'plate_number' => 'ABC-1234',
                'model' => 'Hino Grand Coach',
                'seating_capacity' => 45,
                'status' => 'available',
                'last_service_date' => now()->subMonths(6),
                'next_service_due' => now()->addDays(5), // Upcoming
                'total_mileage' => 45000.5,
            ],
            [
                'plate_number' => 'XYZ-5678',
                'model' => 'Yutong ZK6122H9',
                'seating_capacity' => 49,
                'status' => 'under_maintenance',
                'last_service_date' => now()->subMonths(4),
                'next_service_due' => now()->subDays(2), // Overdue
                'total_mileage' => 82000.0,
            ],
            [
                'plate_number' => 'LMN-9101',
                'model' => 'Golden Dragon XML6127',
                'seating_capacity' => 53,
                'status' => 'in_service',
                'last_service_date' => now()->subMonths(1),
                'next_service_due' => now()->addMonths(2), // Healthy
                'total_mileage' => 12000.8,
            ],
            [
                'plate_number' => 'PQR-2233',
                'model' => 'Isuzu FRR',
                'seating_capacity' => 30,
                'status' => 'available',
                'last_service_date' => now()->subMonths(8),
                'next_service_due' => now()->subDays(15), // Very Overdue
                'total_mileage' => 110000.2,
            ],
        ];

        foreach ($buses as $bus) {
            Bus::create($bus);
        }
    }
}
