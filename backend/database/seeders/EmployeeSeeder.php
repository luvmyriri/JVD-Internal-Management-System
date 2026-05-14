<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = [
            [
                'employee_id' => 'EMP-001',
                'first_name' => 'Minda',
                'last_name' => 'Lamsen',
                'email' => 'minda.lamsen@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'admin',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Minda+Lamsen&background=random',
            ],
            [
                'employee_id' => 'EMP-002',
                'first_name' => 'Jaymart',
                'last_name' => 'Lamsen',
                'email' => 'jaymart.lamsen@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'accounting',
                'department' => 'Accounting',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Jaymart+Lamsen&background=random',
            ],
            [
                'employee_id' => 'EMP-003',
                'first_name' => 'John',
                'last_name' => 'Mechanic',
                'email' => 'john.mechanic@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'agent',
                'department' => 'Maintenance',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=John+Mechanic&background=random',
            ],
            [
                'employee_id' => 'EMP-004',
                'first_name' => 'Driver',
                'last_name' => 'One',
                'email' => 'driver1@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'agent',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Driver+One&background=random',
            ],
            [
                'employee_id' => 'EMP-005',
                'first_name' => 'Sarah',
                'last_name' => 'HR',
                'email' => 'sarah.hr@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'human_resource',
                'department' => 'Human Resources',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Sarah+HR&background=random',
            ],
        ];

        foreach ($employees as $employee) {
            \App\Models\User::updateOrCreate(
                ['email' => $employee['email']],
                $employee
            );
        }
    }
}
