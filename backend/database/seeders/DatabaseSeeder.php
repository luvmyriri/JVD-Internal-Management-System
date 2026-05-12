<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Creates initial Super Admin account per Architecture § 2.1.
     */
    public function run(): void
    {
        // Super Admin — initial system administrator
        User::updateOrCreate(
            ['email' => 'admin@jvd.com'],
            [
                'employee_id' => 'EMP-0001',
                'password' => Hash::make('JVD@Admin2026!'),
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'role' => 'super_admin',
                'department' => 'Administration',
                'is_active' => true,
                'must_change_password' => true,     // Force password change on first login
            ]
        );

        $this->command->info('✓ Super Admin account created: admin@jvd.com');
        $this->command->warn('  Temporary password: JVD@Admin2026!');
        $this->command->warn('  User will be forced to change password on first login.');
    }
}
