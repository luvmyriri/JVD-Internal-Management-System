<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\User;
use App\Models\Service;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        $service = Service::first();
        if (!$admin || !$service) return;

        $invoices = [
            [
                'invoice_number' => 'INV-2024-001',
                'customer_id' => 1,
                'customer_name' => 'John Doe',
                'customer_address' => '123 Main St, Manila',
                'customer_email' => 'john@example.com',
                'customer_contact' => '09171234567',
                'subtotal' => 2500.00,
                'tax_amount' => 300.00,
                'total_amount' => 2800.00,
                'payment_method' => 'GCash',
                'status' => 'paid',
                'created_by' => $admin->id,
            ],
            [
                'invoice_number' => 'INV-2024-002',
                'customer_id' => 2,
                'customer_name' => 'Jane Smith',
                'customer_address' => '456 Oak Rd, Quezon City',
                'customer_email' => 'jane@example.com',
                'customer_contact' => '09187654321',
                'subtotal' => 5000.00,
                'tax_amount' => 600.00,
                'total_amount' => 5600.00,
                'payment_method' => 'Bank Transfer',
                'status' => 'pending',
                'created_by' => $admin->id,
            ],
            [
                'invoice_number' => 'INV-2024-003',
                'customer_id' => 1,
                'customer_name' => 'John Doe',
                'customer_address' => '123 Main St, Manila',
                'customer_email' => 'john@example.com',
                'customer_contact' => '09171234567',
                'subtotal' => 15000.00,
                'tax_amount' => 1800.00,
                'total_amount' => 16800.00,
                'payment_method' => 'Cash',
                'status' => 'paid',
                'created_by' => $admin->id,
            ],
            [
                'invoice_number' => 'INV-2024-004',
                'customer_id' => 3,
                'customer_name' => 'Bob Wilson',
                'customer_address' => '789 Pine Ave, Makati',
                'customer_email' => 'bob@example.com',
                'customer_contact' => '09192223333',
                'subtotal' => 1200.00,
                'tax_amount' => 144.00,
                'total_amount' => 1344.00,
                'payment_method' => 'Credit Card',
                'status' => 'cancelled',
                'created_by' => $admin->id,
            ],
        ];

        foreach ($invoices as $data) {
            $invoice = Invoice::create($data);
            
            // Randomly pick a service for the items
            $randomService = Service::inRandomOrder()->first();
            
            $invoice->items()->create([
                'service_id' => $randomService->id,
                'quantity' => 1,
                'unit_price' => $data['subtotal'],
                'total_price' => $data['subtotal'],
            ]);
        }
    }
}
