<?php

namespace Database\Seeders;

use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\POLineItem;

use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?? User::first();
        $supplier = \App\Models\Supplier::first();
        if (!$admin || !$supplier) return;

        $orders = [
            [
                'po_number' => 'PO-2024-001',
                'supplier_id' => $supplier->id,
                'created_by' => $admin->id,
                'total_amount' => 50000.00,
                'status' => 'approved',
                'approved_at' => now(),
            ],
            [
                'po_number' => 'PO-2026-001',
                'supplier_id' => $supplier->id,
                'total_amount' => 5000.00,
                'status' => 'pending_accounting_review',
                'created_by' => $admin->id,
            ],
        ];

        foreach ($orders as $order) {
            $po = PurchaseOrder::create($order);
            
            \DB::table('po_line_items')->insert([
                'purchase_order_id' => $po->id,
                'item_name' => 'General Supplies',
                'quantity' => 1,
                'unit_price' => $po->total_amount,
                'total_price' => $po->total_amount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

    }
}
