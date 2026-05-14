<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'company_name' => 'Caltex Susano',
                'contact_person' => 'Juan Dela Cruz',
                'email' => 'juan@caltex.com',
                'phone' => '09171234567',
                'address' => 'Susano Road, Caloocan',
                'accreditation_status' => 'accredited',
                'is_verified' => true
            ],
            [
                'company_name' => 'Victory Liner Parts',
                'contact_person' => 'Maria Santos',
                'email' => 'maria@victory.com',
                'phone' => '09187654321',
                'address' => 'Pasay City',
                'accreditation_status' => 'accredited',
                'is_verified' => true
            ],
            [
                'company_name' => 'Globe Telecom',
                'contact_person' => 'Peter Parker',
                'email' => 'peter@globe.com',
                'phone' => '09159990000',
                'address' => 'BGC, Taguig',
                'accreditation_status' => 'accredited',
                'is_verified' => true
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
}
