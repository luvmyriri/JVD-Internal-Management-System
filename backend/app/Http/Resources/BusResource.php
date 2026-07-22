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
            'vehicle_type'      => $this->vehicle_type ?? 'bus',
            'bus_category'      => $this->bus_category,
            'seating_capacity'  => $this->seating_capacity,
            'status'            => $this->status,
            'total_mileage'     => (float) $this->total_mileage,
            'last_service_date' => $this->last_service_date?->toDateString(),
            'next_service_due'  => $this->next_service_due?->toDateString(),
            'is_service_overdue'=> $this->next_service_due
                                    ? now()->toDateString() > $this->next_service_due->toDateString()
                                    : false,
            'custom_seats'      => $this->custom_seats,
            'driver'            => $this->whenLoaded('driver', fn() => [
                'id'         => $this->driver->id,
                'first_name' => $this->driver->first_name,
                'last_name'  => $this->driver->last_name,
            ]),
            'work_orders'       => $this->whenLoaded('workOrders', fn() =>
                $this->workOrders->map(fn($wo) => [
                    'id'          => $wo->id,
                    'wo_number'   => $wo->wo_number,
                    'type'        => $wo->type,
                    'status'      => $wo->status,
                    'priority'    => $wo->priority,
                    'description' => $wo->description,
                    'cost'        => (float) $wo->cost,
                    'parts_used'  => $wo->parts_used,
                    'created_at'  => $wo->created_at->toISOString(),
                    'assignee'    => $wo->assignee ? [
                        'id'         => $wo->assignee->id,
                        'first_name' => $wo->assignee->first_name,
                        'last_name'  => $wo->assignee->last_name,
                    ] : null,
                ])
            ),
            'created_at'        => $this->created_at->toISOString(),
            'updated_at'        => $this->updated_at->toISOString(),
        ];
    }
}
