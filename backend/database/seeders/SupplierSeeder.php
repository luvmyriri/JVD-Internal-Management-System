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
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
}
