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
                'employee_id' => 'JVD-SA-001',
                'first_name' => 'Jhune Ernest',
                'last_name' => 'Ogoy II',
                'email' => 'jhune@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'super_admin',
                'department' => 'Administration',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Jhune+Ogoy&background=f43f5e&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-SA-002',
                'first_name' => 'Rhean',
                'last_name' => 'Umali',
                'email' => 'rhean@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'executive_vice_president',
                'department' => 'Administration',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Rhean+Umali&background=ec4899&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-LIC-001',
                'first_name' => 'Loe',
                'last_name' => 'Bendana',
                'email' => 'loe@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'logistics_in_charge',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Loe+Bendana&background=84cc16&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DIS-001',
                'first_name' => 'LJ',
                'last_name' => 'Ogoy',
                'email' => 'lj@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'dispatcher',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=LJ+Ogoy&background=d946ef&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-PM-001',
                'first_name' => 'Jaymart',
                'last_name' => 'Ogoy',
                'email' => 'jaymart@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'purchasing_manager',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Jaymart+Ogoy&background=0ea5e9&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-SA-101',
                'first_name' => 'Minda',
                'last_name' => 'Hernandez',
                'email' => 'minda@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'service_adviser',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Minda+Hernandez&background=78716c&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-HM-001',
                'first_name' => 'Arnold',
                'last_name' => 'Navero',
                'email' => 'arnold@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'head_mechanic',
                'department' => 'Maintenance',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Arnold+Navero&background=737373&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-OM-001',
                'first_name' => 'Rhazel',
                'last_name' => 'Perez',
                'email' => 'rhazel@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'operations_manager',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Rhazel+Perez&background=06b6d4&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-RO-001',
                'first_name' => 'Mia',
                'last_name' => 'Abella',
                'email' => 'mia@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'reservation_officer',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Mia+Abella&background=f97316&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-OS-001',
                'first_name' => 'Lysa',
                'last_name' => 'Larda',
                'email' => 'lysa@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'office_staff',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Lysa+Larda&background=eab308&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-OS-002',
                'first_name' => 'Cristopher',
                'last_name' => 'Balgomera',
                'email' => 'cristopher@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'office_staff',
                'department' => 'Operations',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Cristopher+Balgomera&background=eab308&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-AE-001',
                'first_name' => 'Clint Calvin',
                'last_name' => 'Eleazar',
                'email' => 'clint@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'accounting_executive',
                'department' => 'Accounting',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Clint+Eleazar&background=14b8a6&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-AE-002',
                'first_name' => 'Franz',
                'last_name' => 'Ramos',
                'email' => 'franz@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'accounting_executive',
                'department' => 'Accounting',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Franz+Ramos&background=14b8a6&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-CS-001',
                'first_name' => 'Crisalyn',
                'last_name' => 'Cahalhal',
                'email' => 'crisalyn@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'corporate_secretary',
                'department' => 'Human Resources',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Crisalyn+Cahalhal&background=ec4899&color=fff&size=512',
            ],
            // 9 Drivers
            [
                'employee_id' => 'JVD-DRV-001',
                'first_name' => 'Eduardo E.',
                'last_name' => 'Deblios',
                'email' => 'eduardo@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Eduardo+Deblios&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-002',
                'first_name' => 'Ken Peroja',
                'last_name' => 'Baynosa',
                'email' => 'ken@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Ken+Baynosa&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-003',
                'first_name' => 'Franklin',
                'last_name' => 'Sarmiento',
                'email' => 'franklin@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Franklin+Sarmiento&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-004',
                'first_name' => 'Isidro A.',
                'last_name' => 'Figuera',
                'email' => 'isidro@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Isidro+Figuera&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-005',
                'first_name' => 'Reymundo',
                'last_name' => 'Madrona',
                'email' => 'reymundo@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Reymundo+Madrona&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-006',
                'first_name' => 'Froilan L.',
                'last_name' => 'Villaflor',
                'email' => 'froilan@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Froilan+Villaflor&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-007',
                'first_name' => 'Mark Johnson',
                'last_name' => 'Abella',
                'email' => 'mark@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Mark+Abella&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-008',
                'first_name' => 'Joseph P.',
                'last_name' => 'Corpin',
                'email' => 'joseph@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Joseph+Corpin&background=6366f1&color=fff&size=512',
            ],
            [
                'employee_id' => 'JVD-DRV-009',
                'first_name' => 'Alexander',
                'last_name' => 'Bordeos',
                'email' => 'alexander@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'driver',
                'department' => 'Logistics',
                'is_active' => true,
                'avatar_url' => 'https://ui-avatars.com/api/?name=Alexander+Bordeos&background=6366f1&color=fff&size=512',
            ],
        ];

        foreach ($employees as $employee) {
            $employee['two_factor_verified_at'] = now();
            
            $role = $employee['role'];
            $tags = [];
            
            if ($role === 'executive_vice_president') {
                $tags = [
                    'process:approve_commission',
                    'process:approve_cash_budget',
                    'process:disburse_cash_budget',
                    'process:settle_liquidation'
                ];
            } elseif ($role === 'operations_manager') {
                $tags = [
                    'process:approve_commission',
                    'process:approve_cash_budget',
                    'process:disburse_cash_budget'
                ];
            } elseif ($role === 'accounting_executive') {
                $tags = [
                    'process:disburse_cash_budget',
                    'process:settle_liquidation'
                ];
            } elseif (in_array($role, ['logistics_in_charge', 'dispatcher'])) {
                $tags = [
                    'process:disburse_cash_budget'
                ];
            }
            
            $employee['tags'] = $tags;
            $employee['must_change_password'] = false;

            \App\Models\User::updateOrCreate(
                ['email' => $employee['email']],
                $employee
            );
        }
    }
}
