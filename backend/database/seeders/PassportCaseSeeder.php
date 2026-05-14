<?php

namespace Database\Seeders;

use App\Models\PassportCase;
use App\Models\User;
use Illuminate\Database\Seeder;

class PassportCaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $cases = [
            [
                'customer_id' => 1,
                'passenger_id' => 1,
                'handled_by' => $admin->id,
                'case_type' => 'passport',
                'status' => 'requirements_gathering',
                'checklist' => json_encode([
                    'psa_birth_certificate' => true,
                    'valid_id' => true,
                    'appointment_form' => false,
                ]),
            ],
            [
                'customer_id' => 2,
                'passenger_id' => 2,
                'handled_by' => $admin->id,
                'case_type' => 'visa',
                'status' => 'documents_complete',
                'checklist' => json_encode([
                    'passport' => true,
                    'bank_statement' => true,
                    'itinerary' => true,
                ]),
            ],
        ];

        foreach ($cases as $case) {
            PassportCase::create($case);
        }
    }
}
