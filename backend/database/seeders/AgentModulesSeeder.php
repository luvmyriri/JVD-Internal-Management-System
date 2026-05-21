<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;
use App\Models\InventoryItem;
use App\Models\Customer;

class AgentModulesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed Suppliers
        $suppliers = [
            [
                'company_name' => 'TechPro Solutions',
                'contact_person' => 'Jane Smith',
                'phone' => '09171234567',
                'email' => 'jane@techpro.com',
                'address' => '123 Tech Ave, Makati City',
                'is_verified' => true,
                'payment_terms' => 'Net 30',
                'bank_name' => 'BPI',
                'bank_account_number' => '1234-5678-90',
                'tin_number' => '123-456-789-000',
                'accreditation_status' => 'accredited'
            ],
            [
                'company_name' => 'AutoParts Hub',
                'contact_person' => 'Mark Johnson',
                'phone' => '09189876543',
                'email' => 'mark@autopartshub.ph',
                'address' => '456 Auto Row, Quezon City',
                'is_verified' => false,
                'payment_terms' => 'COD',
                'bank_name' => 'BDO',
                'bank_account_number' => '0987-6543-21',
                'tin_number' => '987-654-321-000',
                'accreditation_status' => 'pending'
            ]
        ];

        foreach ($suppliers as $sup) {
            Supplier::create($sup);
        }

        // 2. Seed Inventory Items
        $inventory = [
            [
                'item_name' => 'A4 Bond Paper',
                'category' => 'Office Supplies',
                'quantity' => 150,
                'reorder_level' => 20,
                'unit' => 'reams',
                'unit_cost' => 250.00
            ],
            [
                'item_name' => 'Engine Oil 10W-40',
                'category' => 'Maintenance',
                'quantity' => 45,
                'reorder_level' => 15,
                'unit' => 'liters',
                'unit_cost' => 350.00
            ],
            [
                'item_name' => 'Printer Ink Black',
                'category' => 'Office Supplies',
                'quantity' => 5,
                'reorder_level' => 10, // will show as low stock
                'unit' => 'bottles',
                'unit_cost' => 450.00
            ]
        ];

        foreach ($inventory as $inv) {
            InventoryItem::create($inv);
        }

        // 3. Seed Customers
        $customers = [
            [
                'first_name' => 'Alice',
                'last_name' => 'Wonderland',
                'email' => 'alice@example.com',
                'phone' => '09221112233',
                'address' => '789 Rabbit Hole St, Pasig City',
                'notes' => 'VIP Customer'
            ],
            [
                'first_name' => 'Bob',
                'last_name' => 'Builder',
                'email' => 'bob@example.com',
                'phone' => '09334445566',
                'address' => '321 Construction Blvd, Taguig City',
                'notes' => 'Requires corporate billing'
            ]
        ];

        foreach ($customers as $cus) {
            Customer::create($cus);
        }
    }
}
