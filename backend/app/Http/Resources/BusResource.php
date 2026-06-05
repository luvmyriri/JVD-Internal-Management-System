<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'plate_number'      => $this->plate_number,
            'model'             => $this->model,
            'bus_category'      => $this->bus_category,
            'seating_capacity'  => $this->seating_capacity,
            'status'            => $this->status,
            'total_mileage'     => (float) $this->total_mileage,
            'last_service_date' => $this->last_service_date?->toDateString(),
            'next_service_due'  => $this->next_service_due?->toDateString(),
            'is_service_overdue'=> $this->next_service_due
                                    ? now()->toDateString() > $this->next_service_due->toDateString()
                                    : false,
            'driver'            => $this->whenLoaded('driver', fn() => [
                'id'         => $this->driver->id,
                'first_name' => $this->driver->first_name,
                'last_name'  => $this->driver->last_name,
            ]),
            'created_at'        => $this->created_at->toISOString(),
            'updated_at'        => $this->updated_at->toISOString(),
        ];
    }
}
