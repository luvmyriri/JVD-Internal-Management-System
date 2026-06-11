<?php

namespace Database\Seeders;

use App\Models\PassportCase;
use App\Models\PassportCaseDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class PassportCaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $cases = [
            [
                'id' => 1,
                'customer_id' => 1,
                'passenger_id' => 1,
                'handled_by' => $admin->id,
                'case_type' => 'passport',
                'status' => 'requirements_gathering',
                'checklist' => [
                    'Birth Certificate (PSA)' => true,
                    'Valid Government ID' => true,
                    'Accomplished DFA Form' => false,
                ],
            ],
            [
                'id' => 2,
                'customer_id' => 2,
                'passenger_id' => 2,
                'handled_by' => $admin->id,
                'case_type' => 'visa',
                'status' => 'documents_complete',
                'checklist' => [
                    'Valid Passport' => true,
                    'Visa Application Form' => true,
                    'Proof of Accommodation' => true,
                ],
            ],
        ];

        foreach ($cases as $caseData) {
            // Find or create
            $case = PassportCase::find($caseData['id']);
            if ($case) {
                $case->update($caseData);
            } else {
                $case = PassportCase::create($caseData);
            }

            if ($case->case_type === 'passport') {
                // Seed birth certificate doc if not present
                $path1 = 'passport_cases/' . $case->id . '/birth_certificate.pdf';
                if (!Storage::disk('public')->exists($path1)) {
                    Storage::disk('public')->put($path1, '%PDF-1.4 dummy birth certificate');
                }
                
                PassportCaseDocument::firstOrCreate(
                    [
                        'passport_case_id' => $case->id,
                        'title' => 'Birth Certificate (PSA)',
                    ],
                    [
                        'customer_id' => $case->customer_id,
                        'file_path' => $path1,
                        'uploaded_by' => null, // customer upload
                    ]
                );

                // Seed valid gov id if not present
                $path2 = 'passport_cases/' . $case->id . '/valid_id.pdf';
                if (!Storage::disk('public')->exists($path2)) {
                    Storage::disk('public')->put($path2, '%PDF-1.4 dummy valid id');
                }

                PassportCaseDocument::firstOrCreate(
                    [
                        'passport_case_id' => $case->id,
                        'title' => 'Valid Government ID',
                    ],
                    [
                        'customer_id' => $case->customer_id,
                        'file_path' => $path2,
                        'uploaded_by' => $admin->id, // staff upload
                    ]
                );
            } else {
                // Seed valid passport doc if not present
                $path3 = 'passport_cases/' . $case->id . '/valid_passport.pdf';
                if (!Storage::disk('public')->exists($path3)) {
                    Storage::disk('public')->put($path3, '%PDF-1.4 dummy valid passport');
                }

                PassportCaseDocument::firstOrCreate(
                    [
                        'passport_case_id' => $case->id,
                        'title' => 'Valid Passport',
                    ],
                    [
                        'customer_id' => $case->customer_id,
                        'file_path' => $path3,
                        'uploaded_by' => null, // customer upload
                    ]
                );
            }
        }
    }
}
