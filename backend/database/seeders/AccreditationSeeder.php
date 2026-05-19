<?php

namespace Database\Seeders;

use App\Models\Accreditation;
use Illuminate\Database\Seeder;

class AccreditationSeeder extends Seeder
{
    public function run(): void
    {
        $bus = \App\Models\Bus::first();
        $supplier = \App\Models\Supplier::first();

        $accreditations = [
            [
                'entity_type' => 'company',
                'entity_id' => $supplier?->id ?? 1,
                'entity_name' => 'Caltex Philippines',
                'accreditation_type' => 'Fuel Supplier',
                'issuing_body' => 'DTI',
                'issue_date' => '2024-01-15',
                'expiry_date' => '2025-01-15',
                'status' => 'active',
                'contact_person' => 'Juan Dela Cruz',
                'contact_email' => 'johnemmanuelnalang+acc1@gmail.com',
            ],
            [
                'entity_type' => 'bus',
                'entity_id' => $bus?->id ?? 1,
                'accreditation_type' => 'LTFRB CPC',
                'issuing_body' => 'LTFRB',
                'issue_date' => now()->subYear(),
                'expiry_date' => now()->addYear(),
                'status' => 'active',
            ],
            [
                'entity_type' => 'company',
                'entity_id' => 1, // JVD Company
                'accreditation_type' => 'Business Permit',
                'issuing_body' => 'LGU Caloocan',
                'issue_date' => now()->subMonths(6),
                'expiry_date' => now()->addMonths(6),
                'status' => 'active',
            ],
        ];

        foreach ($accreditations as $acc) {
            Accreditation::create($acc);

        }
    }
}
