<?php

namespace Database\Seeders;

use App\Models\LegalDocument;
use App\Models\User;
use Illuminate\Database\Seeder;

class LegalDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $docs = [
            [
                'job_order_id' => 1,
                'title' => 'Bus Rental Agreement - Baguio Trip',
                'document_type' => 'contract',
                'file_path' => 'legal/rental_agreement_baguio.pdf',
                'uploaded_by' => $admin->id,
                'notes' => 'Signed by customer on 2024-05-12',
            ],
            [
                'job_order_id' => 1,
                'title' => 'Passenger Waiver and Release',
                'document_type' => 'waiver',
                'file_path' => 'legal/waiver_baguio.pdf',
                'uploaded_by' => $admin->id,
                'notes' => 'Bulk waiver for all passengers',
            ],
        ];

        foreach ($docs as $doc) {
            LegalDocument::create($doc);
        }
    }
}
