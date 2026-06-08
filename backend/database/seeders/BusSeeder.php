<?php

namespace Database\Seeders;

use App\Models\Bus;
use Illuminate\Database\Seeder;

class BusSeeder extends Seeder
{
    public function run(): void
    {
        // SQLite-compatible truncate with FK constraints disabled
        \DB::statement('PRAGMA foreign_keys = OFF;');
        \DB::table('buses')->delete();
        \DB::statement('PRAGMA foreign_keys = ON;');

        $buses = [
            // Standard Economy
            ['plate_number' => 'NGA 3628', 'model' => 'U1', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 1397', 'model' => 'U2', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 1398', 'model' => 'U3', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 2230', 'model' => 'U4', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 1135', 'model' => 'K1', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'APA 4526', 'model' => '51', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'AAJ 2192', 'model' => '52', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'HIN 5011', 'model' => 'DB11', 'bus_category' => 'ECONOMY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            
            // Luxury (Charging Port, No Toilet)
            ['plate_number' => 'NKG 4030', 'model' => 'H1', 'bus_category' => 'LUXURY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKG 4038', 'model' => 'H2', 'bus_category' => 'LUXURY', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            
            // VIP (Toilet, Charging Port)
            ['plate_number' => 'NKR 8458', 'model' => 'H3', 'bus_category' => 'VIP', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 8460', 'model' => 'H4', 'bus_category' => 'VIP', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
            ['plate_number' => 'NKR 8457', 'model' => 'H5', 'bus_category' => 'VIP', 'seating_capacity' => 49, 'status' => 'available', 'total_mileage' => 0],
        ];

        foreach ($buses as $bus) {
            Bus::create($bus);
        }
    }
}
