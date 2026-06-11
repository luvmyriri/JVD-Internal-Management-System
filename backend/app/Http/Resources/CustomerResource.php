<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'first_name'  => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name'   => $this->last_name,
            'suffix'      => $this->suffix,
            'full_name'   => collect([$this->first_name, $this->middle_name, $this->last_name, $this->suffix])->filter()->join(' '),
            'email'       => $this->email,
            'phone'       => $this->phone,
            'address'     => $this->address,
            'notes'       => $this->notes,
            'passengers' => PassengerResource::collection($this->whenLoaded('passengers')),
            'invoices'   => InvoiceResource::collection($this->whenLoaded('invoices')),
            'passports'  => $this->whenLoaded('passports'),
            'visas'      => $this->whenLoaded('visas'),
            'kycs'       => $this->whenLoaded('kycs'),
            'tasks'      => $this->whenLoaded('tasks'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
