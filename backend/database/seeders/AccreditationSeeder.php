<?php

namespace Database\Seeders;

use App\Models\Accreditation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccreditationSeeder extends Seeder
{
    public function run(): void
    {
        // Drop the Postgres check constraint created by the enum, since we changed it to a string later.
        DB::statement('ALTER TABLE accreditations DROP CONSTRAINT IF EXISTS accreditations_entity_type_check');

        // Clear previous accreditations to avoid duplicates during repeated seeding
        DB::table('accreditations')->truncate();

        $accreditations = [
            // Partnerships & Suppliers
            [
                'entity_type' => 'supplier',
                'entity_id' => 1,
                'entity_name' => 'Caltex Philippines',
                'accreditation_type' => 'Fuel Supplier',
                'issuing_body' => 'DTI',
                'issue_date' => now()->subMonths(5),
                'expiry_date' => now()->addMonths(7),
                'status' => 'active',
                'contact_person' => 'Juan Dela Cruz',
                'contact_email' => 'johnemmanuelnalang@gmail.com',
                'kyc_document_url' => 'https://example.com/kyc-caltex.pdf',
                'nda_document_url' => 'https://example.com/nda-caltex.pdf',
            ],
            [
                'entity_type' => 'partner',
                'entity_id' => 1,
                'entity_name' => 'Lionsjade Corp',
                'accreditation_type' => 'Maintenance Partner',
                'issuing_body' => 'LTO',
                'issue_date' => now()->subYear(),
                'expiry_date' => now()->subDays(2),
                'status' => 'expired',
                'contact_person' => 'Maria Santos',
                'contact_email' => 'johnemmanuelnalang@gmail.com',
                'terms_document_url' => 'https://example.com/terms.pdf',
            ],
            [
                'entity_type' => 'client',
                'entity_id' => 1,
                'entity_name' => 'Department of Tourism',
                'accreditation_type' => 'Travel Operator',
                'issuing_body' => 'DOT',
                'issue_date' => now()->subMonths(1),
                'expiry_date' => now()->addMonths(11),
                'status' => 'active',
                'contact_person' => 'Asec. Garcia',
                'contact_email' => 'johnemmanuelnalang@gmail.com',
            ],
            // Fleet & Assets
            [
                'entity_type' => 'bus',
                'entity_id' => 1,
                'entity_name' => 'Bus NDX-1234',
                'accreditation_type' => 'LTFRB CPC Franchise',
                'issuing_body' => 'LTFRB',
                'issue_date' => now()->subMonths(10),
                'expiry_date' => now()->addDays(15),
                'status' => 'pending_renewal',
                'contact_person' => 'Fleet Manager',
                'contact_email' => 'johnemmanuelnalang@gmail.com',
                'kyc_document_url' => 'https://example.com/bus-orcr.pdf',
            ],
            [
                'entity_type' => 'driver',
                'entity_id' => 1,
                'entity_name' => 'Pedro Penduko',
                'accreditation_type' => 'Professional License',
                'issuing_body' => 'LTO',
                'issue_date' => now()->subYears(2),
                'expiry_date' => now()->addYears(1),
                'status' => 'active',
                'contact_person' => 'Pedro Penduko',
                'contact_email' => 'johnemmanuelnalang@gmail.com',
                'kyc_document_url' => 'https://example.com/license-pedro.pdf',
            ],
        ];

        foreach ($accreditations as $acc) {
            Accreditation::create($acc);
        }
    }
}
