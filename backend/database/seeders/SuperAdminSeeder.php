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
        $email = 'johnemmanuelnalang+superadmin@gmail.com';
        
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'employee_id' => 'SA-0001',
                'password' => Hash::make('JVD@Admin2026!'),
                'first_name' => 'Val',
                'last_name' => 'Lamsen',
                'role' => 'super_admin',
                'department' => 'Administration',
                'avatar_url' => 'https://ui-avatars.com/api/?name=Val+Lamsen&background=0D8ABC&color=fff&size=512',
                'is_active' => true,
                'must_change_password' => false,
            ]
        );

        $this->command->info("✓ Super Admin account ensured: {$email}");
        $this->command->warn('  Password: JVD@Admin2026!');
    }
}
