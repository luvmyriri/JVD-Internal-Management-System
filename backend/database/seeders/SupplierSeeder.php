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
                'company_name' => 'Caltex Philippines',
                'email' => 'contact@caltex.com',
                'phone' => '+63 917 123 4567',
                'address' => 'Makati City, Metro Manila',
                'is_verified' => true,
                'accreditation_status' => 'accredited',
            ],
            [
                'company_name' => 'Petron Bataan',
                'email' => 'sales@petron.ph',
                'phone' => '+63 918 765 4321',
                'address' => 'Bataan, Philippines',
                'is_verified' => true,
                'accreditation_status' => 'accredited',
            ],
            [
                'company_name' => 'Victory Liner Parts Depot',
                'email' => 'parts@victoryliner.com',
                'phone' => '+63 920 111 2222',
                'address' => 'Pasay City, Metro Manila',
                'is_verified' => false,
                'accreditation_status' => 'pending',
            ],
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
