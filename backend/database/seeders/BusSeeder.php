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
            ],
            [
                'plate_number' => 'XYZ-5678',
                'model' => 'Yutong ZK6122H9',
                'seating_capacity' => 49,
                'status' => 'under_maintenance',
            ],
            [
                'plate_number' => 'LMN-9101',
                'model' => 'Golden Dragon XML6127',
                'seating_capacity' => 53,
                'status' => 'in_service',
            ],
        ];

        foreach ($buses as $bus) {
            Bus::create($bus);
        }
    }
}
