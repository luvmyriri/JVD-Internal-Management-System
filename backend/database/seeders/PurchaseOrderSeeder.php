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
        $jaymart = User::where('email', 'jaymart@jvd.com')->first();
        $clint = User::where('email', 'clint@jvd.com')->first();
        $jhune = User::where('email', 'jhune@jvd.com')->first();
        
        $supplier = \App\Models\Supplier::first();
        if (!$jaymart || !$clint || !$jhune || !$supplier) return;

        // PO-2026-101 represents the completed parts order for JO-2026-101
        $po1 = PurchaseOrder::create([
            'po_number' => 'PO-2026-101',
            'supplier_id' => $supplier->id,
            'created_by' => $jaymart->id,
            'verified_by' => $clint->id,
            'approved_by' => $jhune->id,
            'total_amount' => 4200.00,
            'status' => 'approved',
            'approved_at' => now()->subDays(4),
        ]);
        
        // Link this PO to the maintenance Job Order JO-2026-101
        $jo = \App\Models\JobOrder::where('jo_number', 'JO-2026-101')->first();
        if ($jo) {
            $jo->update(['purchase_order_id' => $po1->id]);
        }

        \DB::table('po_line_items')->insert([
            [
                'purchase_order_id' => $po1->id,
                'item_name' => 'Front Heavy-Duty Brake Pads',
                'part_number' => 'BP-HINO-F789',
                'quantity' => 2,
                'unit_price' => 1200.00,
                'total_price' => 2400.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'purchase_order_id' => $po1->id,
                'item_name' => 'Rear Heavy-Duty Brake Pads',
                'part_number' => 'BP-HINO-R456',
                'quantity' => 2,
                'unit_price' => 900.00,
                'total_price' => 1800.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // PO-2026-102 represents a pending PO for new supplies
        PurchaseOrder::create([
            'po_number' => 'PO-2026-102',
            'supplier_id' => $supplier->id,
            'created_by' => $jaymart->id,
            'total_amount' => 12500.00,
            'status' => 'pending_accounting_review',
        ]);
    }
}
