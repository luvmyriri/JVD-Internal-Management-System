<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'item_name'     => $this->item_name,
            'category'      => $this->category,
            'quantity'      => $this->quantity,
            'reorder_level' => $this->reorder_level,
            'unit'          => $this->unit,
            'unit_cost'     => (float) $this->unit_cost,
            'total_value'   => (float) ($this->unit_cost * $this->quantity),
            'is_low_stock'  => $this->isLowStock(),
            'created_at'    => $this->created_at->toISOString(),
            'updated_at'    => $this->updated_at->toISOString(),
        ];
    }
}
