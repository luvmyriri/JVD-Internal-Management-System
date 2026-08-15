<?php

namespace App\Http\Resources;

use App\Models\PrivateTourBooking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $booking = $this->relationLoaded('booking') ? $this->booking : null;
        $salesOrder = $this->relationLoaded('salesOrder') ? $this->salesOrder : null;
        $privateTourItem = $salesOrder && $salesOrder->relationLoaded('items')
            ? $salesOrder->items->first(fn ($item) => $item->service_type === 'private_tour'
                && $item->relationLoaded('fulfillment')
                && $item->fulfillment instanceof PrivateTourBooking)
            : null;
        /** @var PrivateTourBooking|null $privateTour */
        $privateTour = $privateTourItem?->fulfillment;
        $bus = $this->operationalBus();
        $driver = $this->operationalDriver();

        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'customer_address' => $this->customer_address,
            'customer_email' => $this->notificationEmail(),
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
            'credited_amount' => (float) ($this->credited_amount ?? 0),
            'refunded_amount' => (float) ($this->refunded_amount ?? 0),
            'due_date' => $this->due_date,
            'status' => $this->status,
            'notes' => $this->notes,
            'cash_budget_request_id' => $this->cash_budget_request_id,
            'bus_id' => $this->bus_id,
            'driver_id' => $this->driver_id,
            'seat_map' => $booking?->seat_map,
            'travel_date' => $this->travel_date,
            'pickup_location' => $this->pickup_location,
            'destination' => $this->destination,
            'tour_code' => $this->tour_code,
            'pax_count' => $this->pax_count,
            'arrival_datetime' => $booking?->arrival_datetime ?? $privateTour?->ends_at?->toISOString(),
            'departure_datetime' => $booking?->departure_datetime ?? $privateTour?->starts_at?->toISOString(),
            'bus' => $bus ? [
                'id' => $bus->id,
                'plate_number' => $bus->plate_number,
                'model' => $bus->model,
                'seating_capacity' => $bus->seating_capacity,
            ] : null,
            'driver' => $driver ? [
                'id' => $driver->id,
                'first_name' => $driver->first_name,
                'last_name' => $driver->last_name,
                'phone' => $driver->phone,
                'email' => $driver->email,
            ] : null,
            'private_tour_booking' => $privateTour ? [
                'id' => $privateTour->id,
                'sales_order_item_id' => $privateTour->sales_order_item_id,
                'package_name' => $privateTour->package_name,
                'destination' => $privateTour->destination,
                'starts_at' => $privateTour->starts_at?->toISOString(),
                'ends_at' => $privateTour->ends_at?->toISOString(),
                'pickup_location' => $privateTour->pickup_location,
                'passenger_count' => $privateTour->passenger_count,
                'adult_count' => $privateTour->adult_count,
                'child_count' => $privateTour->child_count,
                'travelers' => $privateTour->traveler_types ?? [],
                'itinerary' => $privateTour->itinerary ?? [],
                'vehicle' => $bus ? [
                    'id' => $bus->id,
                    'plate_number' => $bus->plate_number,
                    'model' => $bus->model,
                    'seating_capacity' => $bus->seating_capacity,
                ] : null,
                'driver' => $driver ? [
                    'id' => $driver->id,
                    'name' => trim($driver->first_name.' '.$driver->last_name),
                    'phone' => $driver->phone,
                    'email' => $driver->email,
                ] : null,
                'trip_ticket_id' => $this->relationLoaded('tripTicket') ? $this->tripTicket?->id : null,
                'trip_ticket_number' => $this->relationLoaded('tripTicket') ? $this->tripTicket?->control_no : null,
            ] : null,
            'trip_tickets' => $this->whenLoaded('tripTickets', fn () => $this->tripTickets->map(fn ($ticket) => [
                'id' => $ticket->id,
                'control_no' => $ticket->control_no,
                'assignment_index' => (int) ($ticket->assignment_index ?? 0),
                'status' => $ticket->status,
                'date_of_travel' => $ticket->date_of_travel,
                'duration' => $ticket->duration,
                'pick_up' => $ticket->pick_up,
                'drop_off' => $ticket->drop_off,
                'no_of_passengers' => (int) $ticket->no_of_passengers,
                'vehicle' => $ticket->bus ? [
                    'id' => $ticket->bus->id,
                    'plate_number' => $ticket->bus->plate_number,
                    'model' => $ticket->bus->model,
                ] : null,
                'driver' => $ticket->driver ? [
                    'id' => $ticket->driver->id,
                    'name' => trim($ticket->driver->first_name.' '.$ticket->driver->last_name),
                    'phone' => $ticket->driver->phone,
                    'email' => $ticket->driver->email,
                ] : null,
            ])->values()),
            'joiner_reservation' => $this->whenLoaded('joinerReservation', function () {
                $reservation = $this->joinerReservation;
                if (! $reservation) {
                    return null;
                }

                return [
                    'id' => $reservation->id,
                    'reference' => $reservation->reference,
                    'status' => $reservation->status,
                    'passenger_count' => $reservation->passenger_count,
                    'seat_codes' => $reservation->passengers->map(fn ($passenger) => $passenger->seat?->seat_code)->filter()->values(),
                    'passengers' => $reservation->passengers->map(fn ($passenger) => [
                        'name' => trim($passenger->first_name.' '.$passenger->last_name),
                        'first_name' => $passenger->first_name,
                        'last_name' => $passenger->last_name,
                        'passenger_type' => $passenger->passenger_type,
                        'date_of_birth' => $passenger->date_of_birth?->toDateString(),
                        'seat_code' => $passenger->seat?->seat_code,
                    ])->values(),
                    'departure' => $reservation->departure ? [
                        'id' => $reservation->departure->id,
                        'code' => $reservation->departure->code,
                        'starts_at' => $reservation->departure->starts_at?->toISOString(),
                        'ends_at' => $reservation->departure->ends_at?->toISOString(),
                        'pickup_instructions' => $reservation->departure->pickup_instructions,
                        'vehicle' => $reservation->departure->bus ? [
                            'id' => $reservation->departure->bus->id,
                            'plate_number' => $reservation->departure->bus->plate_number,
                            'model' => $reservation->departure->bus->model,
                        ] : null,
                        'driver' => $reservation->departure->driver ? [
                            'id' => $reservation->departure->driver->id,
                            'name' => trim($reservation->departure->driver->first_name.' '.$reservation->departure->driver->last_name),
                            'phone' => $reservation->departure->driver->phone,
                            'email' => $reservation->departure->driver->email,
                        ] : null,
                    ] : null,
                ];
            }),
            'charter_booking' => $this->whenLoaded('charterBooking', function () {
                $charter = $this->charterBooking;
                if (! $charter) {
                    return null;
                }

                return [
                    'id' => $charter->id, 'reference' => $charter->reference, 'status' => $charter->status,
                    'starts_at' => $charter->starts_at?->toISOString(), 'ends_at' => $charter->ends_at?->toISOString(),
                    'pickup_location' => $charter->pickup_location, 'destination' => $charter->destination,
                    'passenger_count' => $charter->passenger_count, 'estimated_kilometers' => (float) $charter->estimated_kilometers,
                    'vehicle' => $charter->bus ? ['plate_number' => $charter->bus->plate_number, 'model' => $charter->bus->model] : null,
                ];
            }),
            'educational_tour_booking' => $this->whenLoaded('educationalTourBooking', function () {
                $education = $this->educationalTourBooking;
                if (! $education) {
                    return null;
                }

                return [
                    'id' => $education->id, 'reference' => $education->reference, 'school_name' => $education->school_name,
                    'grade_level' => $education->grade_level, 'starts_at' => $education->starts_at?->toISOString(),
                    'ends_at' => $education->ends_at?->toISOString(), 'student_count' => $education->student_count,
                    'chaperone_count' => $education->chaperone_count,
                    'vehicles' => $education->vehicles->map(fn ($assignment) => [
                        'plate_number' => $assignment->bus?->plate_number, 'model' => $assignment->bus?->model,
                        'driver_name' => $assignment->driver ? $assignment->driver->first_name.' '.$assignment->driver->last_name : null,
                        'planned_passengers' => $assignment->planned_passengers,
                    ]),
                ];
            }),
            'itineraries' => $this->whenLoaded('itineraries', function () {
                return $this->itineraries->map(fn ($it) => [
                    'id' => $it->id,
                    'day_number' => $it->day_number,
                    'date' => $it->date?->toISOString(),
                    'location' => $it->location,
                    'activity_description' => $it->activity_description,
                    'meal_plan' => $it->meal_plan,
                    'accommodation_name' => $it->accommodation_name,
                ]);
            }),
            'passengers' => $this->whenLoaded('passengers', fn () => $this->passengers->map(fn ($passenger) => [
                'id' => $passenger->id,
                'first_name' => $passenger->first_name,
                'last_name' => $passenger->last_name,
                'full_name' => $passenger->full_name,
                'date_of_birth' => $passenger->date_of_birth?->toDateString(),
                'passport_number' => $passenger->passport_number,
                'dietary_restrictions' => $passenger->dietary_restrictions,
                'emergency_contact' => $passenger->emergency_contact,
                'special_needs' => $passenger->special_needs,
            ])),
            'custom_transaction_detail' => $this->whenLoaded('customTransactionDetail'),
            'collection' => $this->whenLoaded('collection', function () {
                if (! $this->collection) {
                    return null;
                }

                return [
                    'id' => $this->collection->id,
                    'invoice_id' => $this->collection->invoice_id,
                    'billing_amount' => (float) $this->collection->billing_amount,
                    'paid_amount' => (float) $this->collection->paid_amount,
                    'remaining_balance' => (float) $this->collection->remaining_balance,
                    'due_date' => $this->collection->due_date,
                    'collection_status' => $this->collection->collection_status,
                    'payments' => $this->collection->relationLoaded('payments')
                        ? $this->collection->payments->map(fn ($payment) => [
                            'id' => $payment->id,
                            'payment_date' => $payment->payment_date,
                            'payment_method' => $payment->payment_method,
                            'amount' => (float) $payment->amount,
                            'balance' => $payment->balance !== null ? (float) $payment->balance : null,
                            'paymongo_payment_id' => $payment->paymongo_payment_id,
                            'created_at' => $payment->created_at?->toISOString(),
                        ])->values()
                        : [],
                ];
            }),
            'sales_order' => $this->whenLoaded('salesOrder', function () use ($salesOrder) {
                if (! $salesOrder) {
                    return null;
                }

                return [
                    'id' => $salesOrder->id,
                    'order_number' => $salesOrder->order_number,
                    'status' => $salesOrder->status,
                    'adjustments' => $salesOrder->relationLoaded('adjustments')
                        ? $salesOrder->adjustments->values()
                        : [],
                    'credit_notes' => $salesOrder->relationLoaded('creditNotes')
                        ? $salesOrder->creditNotes->values()
                        : [],
                    'refunds' => $salesOrder->relationLoaded('refunds')
                        ? $salesOrder->refunds->values()
                        : [],
                ];
            }),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'service_id' => $item->service_id,
                        'passport_case_id' => $item->passport_case_id,
                        'service_name' => $item->item_name ?? $item->service?->name ?? 'N/A',
                        'service_type' => $item->service_type ?? $item->service?->service_type,
                        'item_description' => $item->item_description ?? $item->service?->description,
                        'item_metadata' => $item->item_metadata,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                        'adults' => $item->adults,
                        'children' => $item->children,
                        'adult_price' => $item->adult_price !== null ? (float) $item->adult_price : null,
                        'child_price' => $item->child_price !== null ? (float) $item->child_price : null,
                        'service' => [
                            'id' => $item->service?->id,
                            'name' => $item->item_name ?? $item->service?->name ?? 'N/A',
                            'category' => $item->service?->category ?? $item->service_type ?? 'Custom',
                            'description' => $item->item_description ?? $item->service?->description ?? '',
                        ],
                    ];
                });
            }),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
