<?php

namespace Database\Seeders;

use App\Models\PassportCase;
use Illuminate\Database\Seeder;

class PassportSeeder extends Seeder
{
    public function run(): void
    {
        $customer = \App\Models\Customer::first();
        $passenger = \App\Models\Passenger::first();
        $user = \App\Models\User::first();

        if (!$customer || !$passenger || !$user) return;

        $cases = [
            [
                'customer_id' => $customer->id,
                'passenger_id' => $passenger->id,
                'handled_by' => $user->id,
                'case_type' => 'passport',
                'status' => 'processing',
                'reference_number' => 'PPT-2026-001',
                'submitted_date' => now()->subDays(5),
            ],
            [
                'customer_id' => $customer->id,
                'passenger_id' => $passenger->id,
                'handled_by' => $user->id,
                'case_type' => 'visa',
                'status' => 'ready_for_release',
                'reference_number' => 'VISA-2026-002',
                'submitted_date' => now()->subDays(10),
            ],
        ];

        foreach ($cases as $case) {
            PassportCase::create($case);
        }
    }
}
