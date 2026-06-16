<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EmployeeSalary;

class EmployeeSalarySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $salaryMapping = [
            'super_admin' => [
                'base' => 120000.00,
                'allowances' => 15000.00,
                'deductions' => 10000.00
            ],
            'executive_vice_president' => [
                'base' => 100000.00,
                'allowances' => 12000.00,
                'deductions' => 8000.00
            ],
            'logistics_in_charge' => [
                'base' => 32000.00,
                'allowances' => 3000.00,
                'deductions' => 3000.00
            ],
            'dispatcher' => [
                'base' => 28000.00,
                'allowances' => 2500.00,
                'deductions' => 2800.00
            ],
            'purchasing_manager' => [
                'base' => 38000.00,
                'allowances' => 3500.00,
                'deductions' => 3500.00
            ],
            'service_adviser' => [
                'base' => 32000.00,
                'allowances' => 3000.00,
                'deductions' => 3000.00
            ],
            'head_mechanic' => [
                'base' => 30000.00,
                'allowances' => 3000.00,
                'deductions' => 3000.00
            ],
            'operations_manager' => [
                'base' => 45000.00,
                'allowances' => 5000.00,
                'deductions' => 4500.00
            ],
            'reservation_officer' => [
                'base' => 24000.00,
                'allowances' => 2000.00,
                'deductions' => 2400.00
            ],
            'office_staff' => [
                'base' => 22000.00,
                'allowances' => 2000.00,
                'deductions' => 2200.00
            ],
            'accounting_executive' => [
                'base' => 35000.00,
                'allowances' => 3000.00,
                'deductions' => 3500.00
            ],
            'corporate_secretary' => [
                'base' => 40000.00,
                'allowances' => 4000.00,
                'deductions' => 4000.00
            ],
            'driver' => [
                'base' => 18000.00,
                'allowances' => 6000.00,
                'deductions' => 1800.00
            ]
        ];

        // Seed all users currently in database
        $users = User::all();

        foreach ($users as $user) {
            $role = $user->role;
            // Get mapping, default to office staff if not explicitly defined
            $salary = $salaryMapping[$role] ?? [
                'base' => 20000.00,
                'allowances' => 1500.00,
                'deductions' => 2000.00
            ];

            EmployeeSalary::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'base_salary' => $salary['base'],
                    'allowances' => $salary['allowances'],
                    'deductions' => $salary['deductions']
                ]
            );
        }
    }
}
