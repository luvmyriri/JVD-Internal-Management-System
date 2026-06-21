<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admins = [
            [
                'email' => 'johnemmanuelnalang@gmail.com',
                'employee_id' => 'SA-0001',
                'password' => Hash::make('JVD@Admin2026!'),
                'first_name' => 'Val',
                'last_name' => 'Lamsen',
                'role' => 'super_admin',
                'department' => 'Administration',
                'avatar_url' => 'https://ui-avatars.com/api/?name=Val+Lamsen&background=0D8ABC&color=fff&size=512',
                'is_active' => true,
                'must_change_password' => false,
                'two_factor_verified_at' => now(),
            ],
            [
                'email' => 'vjlamsenlamsen28@gmail.com',
                'employee_id' => 'SA-0002',
                'password' => Hash::make('JVD@Admin2026!'),
                'first_name' => 'VJ',
                'last_name' => 'Lamsen',
                'role' => 'super_admin',
                'department' => 'Administration',
                'avatar_url' => 'https://ui-avatars.com/api/?name=VJ+Lamsen&background=ec4899&color=fff&size=512',
                'is_active' => true,
                'must_change_password' => false,
                'two_factor_verified_at' => now(),
            ],
        ];

        foreach ($admins as $admin) {
            User::updateOrCreate(
                ['email' => $admin['email']],
                $admin
            );
            $this->command->info("✓ Super Admin account ensured: {$admin['email']}");
        }
        $this->command->warn('  Password for both: JVD@Admin2026!');
    }
}
