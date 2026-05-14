<?php

namespace Database\Seeders;

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $orders = [
            [
                'po_number' => 'PO-2024-001',
                'supplier_id' => 1,
                'created_by' => $admin->id,
                'total_amount' => 50000.00,
                'status' => 'approved',
                'approved_at' => now(),
            ],
            [
                'po_number' => 'PO-2024-002',
                'supplier_id' => 3,
                'created_by' => $admin->id,
                'total_amount' => 12500.50,
                'status' => 'pending_accounting_review',
            ],
        ];

        foreach ($orders as $order) {
            $po = PurchaseOrder::create($order);
            
            // Add some line items
            $po->lineItems()->create([
                'item_name' => 'Brake Pad Set',
                'quantity' => 10,
                'unit_price' => 1250.00,
                'total_price' => 12500.00,
            ]);
        }
    }
}
