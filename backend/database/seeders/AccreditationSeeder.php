<?php

namespace Database\Seeders;

use App\Models\Accreditation;
use Illuminate\Database\Seeder;

class AccreditationSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'entity_type' => 'company',
                'entity_id' => 1,
                'entity_name' => 'Caltex Philippines',
                'accreditation_type' => 'Fuel Supplier',
                'issuing_body' => 'DTI',
                'issue_date' => '2024-01-15',
                'expiry_date' => '2025-01-15',
                'status' => 'active',
                'contact_person' => 'Juan Dela Cruz',
                'contact_email' => 'juan@caltex.com',
            ],
            [
                'entity_type' => 'company',
                'entity_id' => 2,
                'entity_name' => 'Victory Liner Parts',
                'accreditation_type' => 'Parts Supplier',
                'issuing_body' => 'SEC',
                'issue_date' => '2023-06-01',
                'expiry_date' => '2024-06-01',
                'status' => 'pending_renewal',
                'contact_person' => 'Maria Santos',
                'contact_email' => 'maria@victoryparts.com',
            ],
            [
                'entity_type' => 'company',
                'entity_id' => 10,
                'entity_name' => 'Starlite Ferries',
                'accreditation_type' => 'Logistics Partner',
                'issuing_body' => 'MARINA',
                'issue_date' => '2024-02-10',
                'expiry_date' => '2025-02-10',
                'status' => 'active',
                'contact_person' => 'Ricardo Dalisay',
                'contact_email' => 'ricardo@starlite.com',
            ],
        ];

        foreach ($data as $item) {
            Accreditation::create($item);
        }
    }
}
