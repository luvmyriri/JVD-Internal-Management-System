<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'jo_number'    => $this->jo_number,
            'service_type' => $this->service_type,
            'status'       => $this->status,
            'service_date' => $this->service_date?->toDateString(),
            'destination'  => $this->destination,
            'total_cost'   => (float) $this->total_cost,
            'notes'        => $this->notes,
            'customer'     => $this->whenLoaded('customer', fn() => [
                'id'         => $this->customer->id,
                'first_name' => $this->customer->first_name,
                'last_name'  => $this->customer->last_name,
                'email'      => $this->customer->email,
                'phone'      => $this->customer->phone,
            ]),
            'bus'          => $this->whenLoaded('bus', fn() => [
                'id'              => $this->bus->id,
                'plate_number'    => $this->bus->plate_number,
                'model'           => $this->bus->model,
                'seating_capacity'=> $this->bus->seating_capacity,
            ]),
            'passengers'   => $this->whenLoaded('passengers', fn() =>
                $this->passengers->map(fn($p) => [
                    'id'         => $p->id,
                    'first_name' => $p->first_name,
                    'last_name'  => $p->last_name,
                    'passport_number' => $p->passport_number,
                ])
            ),
            'created_by'   => $this->created_by,
            'created_at'   => $this->created_at->toISOString(),
            'updated_at'   => $this->updated_at->toISOString(),
        ];
    }
}
