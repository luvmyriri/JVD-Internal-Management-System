<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class POLineItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'item_name'      => $this->item_name,
            'part_number'    => $this->part_number,   // boss-mandated critical field
            'description'    => $this->description,
            'quantity'       => (int) $this->quantity,
            'unit_of_measure'=> $this->unit_of_measure,
            'unit_price'     => (float) $this->unit_price,
            'total_price'    => (float) $this->total_price,
            'receipt_number' => $this->receipt_number,
            'item_notes'     => $this->item_notes,
        ];
    }
}
