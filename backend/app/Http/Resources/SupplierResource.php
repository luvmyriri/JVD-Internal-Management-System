<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'company_name'         => $this->company_name,
            'contact_person'       => $this->contact_person,
            'phone'                => $this->phone,
            'email'                => $this->email,
            'address'              => $this->address,
            // Verification / cross-check (boss-mandated)
            'is_verified'          => (bool) $this->is_verified,
            'verified_at'          => $this->verified_at?->toISOString(),
            'verified_by'          => $this->verified_by,
            'accreditation_status' => $this->accreditation_status ?? 'pending',
            // Payment terms
            'payment_terms'        => $this->payment_terms,
            'is_consignment'       => (bool) $this->is_consignment,
            // Financial / compliance
            'bank_name'            => $this->bank_name,
            'bank_account_number'  => $this->bank_account_number,
            'tin_number'           => $this->tin_number,
            // Counts
            'purchase_orders_count'=> $this->whenCounted('purchaseOrders'),
            'created_at'           => $this->created_at->toISOString(),
            'updated_at'           => $this->updated_at->toISOString(),
        ];
    }
}
