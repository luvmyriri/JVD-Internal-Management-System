<?php

namespace Database\Seeders;

use App\Models\CharterRatePlan;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class CharterRatePlanSeeder extends Seeder
{
    public function run(): void
    {
        $service = Service::firstOrCreate(
            ['name' => 'Standard Bus Rental'],
            [
                'description' => 'Chartered 49-seater tourist bus rental for corporate, school, or private events.',
                'category' => 'Bus Rental',
                'service_type' => 'bus_rental',
                'price' => 12000,
                'is_active' => true,
                'is_sales_catalog' => true,
            ]
        );

        $superAdmin = User::where('role', 'super_admin')->first();
        $adminId = $superAdmin ? $superAdmin->id : 1;

        $plans = [
            [
                'service_id' => $service->id,
                'name' => 'Standard 49-Seater Bus Charter',
                'vehicle_class' => 'bus',
                'base_price' => 12000,
                'included_hours' => 12,
                'included_kilometers' => 100,
                'extra_hour_rate' => 800,
                'extra_kilometer_rate' => 45,
                'overnight_rate' => 3500,
                'includes_driver' => true,
                'includes_fuel' => true,
                'includes_tolls' => false,
                'includes_parking' => false,
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'service_id' => $service->id,
                'name' => 'VIP Luxury Bus Charter (Restroom + Recline)',
                'vehicle_class' => 'bus',
                'base_price' => 18000,
                'included_hours' => 12,
                'included_kilometers' => 100,
                'extra_hour_rate' => 1200,
                'extra_kilometer_rate' => 60,
                'overnight_rate' => 5000,
                'includes_driver' => true,
                'includes_fuel' => true,
                'includes_tolls' => false,
                'includes_parking' => false,
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'service_id' => $service->id,
                'name' => 'Coaster Group Charter (29 Seats)',
                'vehicle_class' => 'coaster',
                'base_price' => 9500,
                'included_hours' => 12,
                'included_kilometers' => 100,
                'extra_hour_rate' => 650,
                'extra_kilometer_rate' => 35,
                'overnight_rate' => 2800,
                'includes_driver' => true,
                'includes_fuel' => true,
                'includes_tolls' => false,
                'includes_parking' => false,
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'service_id' => $service->id,
                'name' => 'Van Executive Charter (14 Seats)',
                'vehicle_class' => 'van',
                'base_price' => 5500,
                'included_hours' => 12,
                'included_kilometers' => 100,
                'extra_hour_rate' => 450,
                'extra_kilometer_rate' => 25,
                'overnight_rate' => 2000,
                'includes_driver' => true,
                'includes_fuel' => true,
                'includes_tolls' => false,
                'includes_parking' => false,
                'is_active' => true,
                'created_by' => $adminId,
            ],
        ];

        foreach ($plans as $plan) {
            CharterRatePlan::firstOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
