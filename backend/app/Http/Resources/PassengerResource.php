<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PassengerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'customer_id'      => $this->customer_id,
            'first_name'       => $this->first_name,
            'last_name'        => $this->last_name,
            'full_name'        => "{$this->first_name} {$this->last_name}",
            'birth_date'       => $this->birth_date?->toDateString(),
            'passport_no'      => $this->passport_no,
            'contact_no'       => $this->contact_no,
            'checklist_status' => $this->checklist_status,
            'customer'         => $this->whenLoaded('customer', fn() => [
                'id'        => $this->customer->id,
                'full_name' => "{$this->customer->first_name} {$this->customer->last_name}",
            ]),
            'created_at'       => $this->created_at->toISOString(),
            'updated_at'       => $this->updated_at->toISOString(),
        ];
    }
}
