<?php

namespace Database\Seeders;

use App\Models\PurchaseOrder;
use App\Models\POLineItem;
use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        $supplier = \App\Models\Supplier::first();
        $user = \App\Models\User::first();

        if (!$supplier || !$user) return;

        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-001',
            'supplier_id' => $supplier->id,
            'total_amount' => 5000.00,
            'status' => 'pending_accounting_review',
            'created_by' => $user->id,
        ]);

        // Note: The model name for line items is likely PurchaseOrderLineItem or similar if not specified.
        // Checking the migration, the table is 'po_line_items'.
        // I will use DB facade to be safe if the model doesn't exist or has a different name.
        \DB::table('po_line_items')->insert([
            'purchase_order_id' => $po->id,
            'item_name' => 'Engine Oil',
            'quantity' => 10,
            'unit_price' => 500.00,
            'total_price' => 5000.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
