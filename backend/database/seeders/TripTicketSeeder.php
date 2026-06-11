<?php

namespace Database\Seeders;

use App\Models\TripTicket;
use App\Models\Bus;
use App\Models\User;
use Illuminate\Database\Seeder;

class TripTicketSeeder extends Seeder
{
    public function run(): void
    {
        $bus = Bus::where('plate_number', 'NGA 3628')->first();
        $bus2 = Bus::where('plate_number', 'NKG 4030')->first();
        
        $driver1 = User::where('email', 'eduardo@jvd.com')->first();
        $driver2 = User::where('email', 'ken@jvd.com')->first();
        
        $dispatcher = User::where('email', 'lj@jvd.com')->first();
        $manager = User::where('email', 'rhazel@jvd.com')->first();
        
        if (!$bus || !$bus2 || !$driver1 || !$driver2 || !$dispatcher || !$manager) return;

        TripTicket::create([
            'control_no' => 'TT-2026-501',
            'issue_date' => now()->subDays(2),
            'date_of_travel' => now()->addDays(5),
            'duration' => '3 Days',
            'pick_up' => 'JVD Terminal, Manila',
            'drop_off' => 'Session Road, Baguio City',
            'bus_id' => $bus->id,
            'plate_no' => $bus->plate_number,
            'no_of_passengers' => 45,
            'driver_id' => $driver1->id,
            'meal_allowance' => 1500.00,
            'diesel' => 8500.00,
            'sop' => 500.00,
            'easy_trip' => 2000.00,
            'autosweep' => 1500.00,
            'fuel_consumed' => 0.00,
            'odometer_reading' => 45000.5,
            'requested_by' => $dispatcher->id,
            'approved_by' => $manager->id,
            'status' => 'approved',
        ]);

        TripTicket::create([
            'control_no' => 'TT-2026-502',
            'issue_date' => now()->subDays(1),
            'date_of_travel' => now()->addDays(12),
            'duration' => '1 Day',
            'pick_up' => 'Caloocan Elementary School',
            'drop_off' => 'Enchanted Kingdom, Santa Rosa',
            'bus_id' => $bus2->id,
            'plate_no' => $bus2->plate_number,
            'no_of_passengers' => 50,
            'driver_id' => $driver2->id,
            'meal_allowance' => 800.00,
            'diesel' => 4000.00,
            'sop' => 300.00,
            'easy_trip' => 1000.00,
            'autosweep' => 800.00,
            'fuel_consumed' => 0.00,
            'odometer_reading' => 12000.8,
            'requested_by' => $dispatcher->id,
            'status' => 'draft',
        ]);
    }
}
