<?php

namespace Database\Seeders;

use App\Models\Bus;
use Illuminate\Database\Seeder;

class BusSeeder extends Seeder
{
    public function run(): void
    {
        $eduardo = \App\Models\User::where('email', 'eduardo@jvd.com')->first();
        $ken = \App\Models\User::where('email', 'ken@jvd.com')->first();
        $franklin = \App\Models\User::where('email', 'franklin@jvd.com')->first();
        $isidro = \App\Models\User::where('email', 'isidro@jvd.com')->first();
        $reymundo = \App\Models\User::where('email', 'reymundo@jvd.com')->first();

        $buses = [
            [
                'plate_number' => 'ABC-1234',
                'model' => 'Hino Grand Coach',
                'seating_capacity' => 45,
                'status' => 'available',
                'last_service_date' => now()->subMonths(6),
                'next_service_due' => now()->addDays(5),
                'total_mileage' => 45000.5,
                'assigned_driver' => $eduardo?->id,
            ],
            [
                'plate_number' => 'XYZ-5678',
                'model' => 'Yutong ZK6122H9',
                'seating_capacity' => 49,
                'status' => 'under_maintenance',
                'last_service_date' => now()->subMonths(4),
                'next_service_due' => now()->subDays(2),
                'total_mileage' => 82000.0,
                'assigned_driver' => $ken?->id,
            ],
            [
                'plate_number' => 'LMN-9101',
                'model' => 'Golden Dragon XML6127',
                'seating_capacity' => 53,
                'status' => 'in_service',
                'last_service_date' => now()->subMonths(1),
                'next_service_due' => now()->addMonths(2),
                'total_mileage' => 12000.8,
                'assigned_driver' => $franklin?->id,
            ],
            [
                'plate_number' => 'PQR-2233',
                'model' => 'Isuzu FRR',
                'seating_capacity' => 30,
                'status' => 'available',
                'last_service_date' => now()->subMonths(8),
                'next_service_due' => now()->subDays(15),
                'total_mileage' => 110000.2,
                'assigned_driver' => $isidro?->id,
            ],
            [
                'plate_number' => 'ABC 9012',
                'model' => 'King Long XMQ6127',
                'seating_capacity' => 51,
                'status' => 'available',
                'last_service_date' => now()->subDays(3),
                'next_service_due' => now()->addMonths(3),
                'total_mileage' => 5000.0,
                'assigned_driver' => $reymundo?->id,
            ],
        ];

        foreach ($buses as $bus) {
            Bus::create($bus);
        }
    }
}
