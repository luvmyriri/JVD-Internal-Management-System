<?php

namespace Database\Seeders;

use App\Models\CashBudgetRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class CashBudgetRequestSeeder extends Seeder
{
    public function run(): void
    {
        $loe = User::where('email', 'loe@jvd.com')->first(); // Logistics in Charge
        $clint = User::where('email', 'clint@jvd.com')->first(); // Accounting Executive
        
        if (!$loe || !$clint) return;

        CashBudgetRequest::create([
            'date' => now()->subDays(2),
            'travel_date' => now()->addDays(5),
            'plate_number' => 'NGA 3628',
            'destination' => 'Session Road, Baguio City',
            'diesel' => 8500.00,
            'meal_allowance' => 1500.00,
            'sop' => 500.00,
            'autosweep' => 1500.00,
            'easytrip' => 2000.00,
            'coach_captain_salary' => 3500.00,
            'spare_driver_salary' => 0.00,
            'total_amount' => 17500.00,
            'status' => 'approved',
            'prepared_by' => $loe->id,
            'approved_by' => $clint->id,
        ]);

        CashBudgetRequest::create([
            'date' => now()->subDays(1),
            'travel_date' => now()->addDays(12),
            'plate_number' => 'NKG 4030',
            'destination' => 'Enchanted Kingdom, Santa Rosa',
            'diesel' => 4000.00,
            'meal_allowance' => 800.00,
            'sop' => 300.00,
            'autosweep' => 800.00,
            'easytrip' => 1000.00,
            'coach_captain_salary' => 1500.00,
            'spare_driver_salary' => 0.00,
            'total_amount' => 8400.00,
            'status' => 'draft',
            'prepared_by' => $loe->id,
        ]);
    }
}
