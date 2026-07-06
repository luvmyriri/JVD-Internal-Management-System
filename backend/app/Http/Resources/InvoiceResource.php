<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'customer_address' => $this->customer_address,
            'customer_email' => $this->customer_email,
            'customer_contact' => $this->customer_contact,
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'amount_received' => $this->amount_received !== null ? (float) $this->amount_received : null,
            'change' => $this->change !== null ? (float) $this->change : null,
            'payment_method' => $this->payment_method,
            'payment_id' => $this->payment_id,
            'payment_url' => $this->payment_url,
            'payment_type' => $this->payment_type,
            'balance' => $this->balance !== null ? (float) $this->balance : null,
            'due_date' => $this->due_date,
            'status' => $this->status,
            'notes' => $this->notes,
            'cash_budget_request_id' => $this->cash_budget_request_id,
            'bus_id' => $this->booking?->bus_id,
            'driver_id' => $this->booking?->driver_id,
            'seat_map' => $this->booking?->seat_map ?? $this->seat_map,
            'travel_date' => $this->booking?->travel_date,
            'pickup_location' => $this->booking?->pickup_location ?? $this->pickup_location,
            'tour_code' => $this->booking?->tour_code,
            'pax_count' => $this->booking?->pax_count,
            'driver' => $this->booking && $this->booking->relationLoaded('driver') && $this->booking->driver ? [
                'id' => $this->booking->driver->id,
                'first_name' => $this->booking->driver->first_name,
                'last_name' => $this->booking->driver->last_name,
            ] : null,
            'collection' => $this->whenLoaded('collection'),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'items' => $this->whenLoaded('items', function() {
                return $this->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_id' => $item->service_id,
                        'service_name' => $item->service->name ?? 'N/A',
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                        'adults' => $item->adults,
                        'children' => $item->children,
                        'service' => [
                            'id' => $item->service->id ?? null,
                            'name' => $item->service->name ?? 'N/A',
                            'category' => $item->service->category ?? 'N/A',
                            'description' => $item->service->description ?? '',
                        ]
                    ];
                });
            }),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
