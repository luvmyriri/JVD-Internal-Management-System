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
                'subtotal' => 5000.00,
                'tax_amount' => 600.00,
                'total_amount' => 5600.00,
                'payment_method' => 'Bank Transfer',
                'status' => 'pending',
                'created_by' => $admin->id,
            ],
        ];

        foreach ($invoices as $data) {
            $invoice = Invoice::create($data);
            
            $invoice->items()->create([
                'service_id' => $service->id,
                'quantity' => 1,
                'unit_price' => $data['subtotal'],
                'total_price' => $data['subtotal'],
            ]);
        }
    }
}
