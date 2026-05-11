<?php

namespace App\Http\Services;

use App\Models\PurchaseOrder;
use App\Models\POLineItem;
use Illuminate\Support\Facades\DB;

class PurchaseOrderService
{
    /**
     * Create a new P.O. draft with line items.
     */
    public function create(array $data, int $userId): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $userId) {
            $po = PurchaseOrder::create([
                'po_number' => $this->generatePONumber(),
                'supplier_id' => $data['supplier_id'],
                'created_by' => $userId,
                'status' => 'draft',
                'total_amount' => 0,
            ]);

            $total = 0;
            foreach ($data['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                POLineItem::create([
                    'purchase_order_id' => $po->id,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? '',
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $lineTotal,
                ]);
                $total += $lineTotal;
            }

            $po->update(['total_amount' => $total]);
            return $po->fresh(['lineItems', 'supplier']);
        });
    }

    /**
     * Generate auto-incrementing P.O. number: PO-2026-0001
     */
    private function generatePONumber(): string
    {
        $year = now()->year;
        $latest = PurchaseOrder::where('po_number', 'like', "PO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->po_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('PO-%d-%04d', $year, $sequence);
    }
}
