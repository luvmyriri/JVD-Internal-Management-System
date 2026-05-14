<?php

namespace Database\Seeders;

use App\Models\Accreditation;
use Illuminate\Database\Seeder;

class AccreditationSeeder extends Seeder
{
    public function run(): void
    {
        $bus = \App\Models\Bus::first();
        if (!$bus) return;

        $accreditations = [
            [
                'entity_type' => 'bus',
                'entity_id' => $bus->id,
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
