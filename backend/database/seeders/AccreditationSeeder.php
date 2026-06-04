<?php

namespace Database\Seeders;

use App\Models\Accreditation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccreditationSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop the Postgres check constraint created by the enum, since we changed it to a string later.
            DB::statement('ALTER TABLE accreditations DROP CONSTRAINT IF EXISTS accreditations_entity_type_check');
        }

        // Clear previous accreditations to avoid duplicates during repeated seeding
        DB::table('accreditations')->truncate();

        // Create mock documents in local public storage so they can be viewed
        $publicAccredDir = storage_path('app/public/accreditations');
        if (!file_exists($publicAccredDir)) {
            mkdir($publicAccredDir, 0755, true);
        }

        $dummyPdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 51 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Mock Accreditation Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n316\n%%EOF";

        $mockFiles = [
            'kyc-caltex.pdf',
            'nda-caltex.pdf',
            'terms.pdf',
            'bus-orcr.pdf',
            'license-pedro.pdf'
        ];

        foreach ($mockFiles as $filename) {
            $filePath = $publicAccredDir . '/' . $filename;
            if (!file_exists($filePath)) {
                file_put_contents($filePath, $dummyPdfContent);
            }
        }

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
                'kyc_document_url' => '/uploads/accreditations/kyc-caltex.pdf',
                'nda_document_url' => '/uploads/accreditations/nda-caltex.pdf',
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
                'terms_document_url' => '/uploads/accreditations/terms.pdf',
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
                'kyc_document_url' => '/uploads/accreditations/bus-orcr.pdf',
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
                'kyc_document_url' => '/uploads/accreditations/license-pedro.pdf',
            ],
        ];

        foreach ($accreditations as $acc) {
            Accreditation::create($acc);
        }
    }
}
