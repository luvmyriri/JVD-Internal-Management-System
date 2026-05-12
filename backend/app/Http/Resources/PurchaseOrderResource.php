<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    /**
     * Transform the PurchaseOrder model into the API contract shape.
     * Matches api-contracts/purchase-orders.yaml
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'po_number'        => $this->po_number,
            'status'           => $this->status,
            'total_amount'     => (float) $this->total_amount,
            'notes'            => $this->rejection_notes,
            'approved_at'      => $this->approved_at?->toISOString(),
            'supplier'         => $this->whenLoaded('supplier', fn() => [
                'id'             => $this->supplier->id,
                'company_name'   => $this->supplier->company_name,
                'contact_person' => $this->supplier->contact_person,
                'phone'          => $this->supplier->phone,
                'email'          => $this->supplier->email,
            ]),
            'line_items'       => POLineItemResource::collection($this->whenLoaded('lineItems')),
            'created_by'       => $this->created_by,
            'verified_by'      => $this->verified_by,
            'approved_by'      => $this->approved_by,
            'created_at'       => $this->created_at->toISOString(),
            'updated_at'       => $this->updated_at->toISOString(),
        ];
    }
}
