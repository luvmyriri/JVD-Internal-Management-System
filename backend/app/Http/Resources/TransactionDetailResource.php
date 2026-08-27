<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use App\Models\PrivateTourBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class TransactionDetailResource extends TransactionSummaryResource
{
    public function toArray(Request $request): array
    {
        /** @var Invoice $invoice */
        $invoice = $this->resource;
        $summary = parent::toArray($request);
        $order = $invoice->relationLoaded('salesOrder') ? $invoice->salesOrder : null;
        $payments = $this->payments($invoice)
            ->sortBy([['payment_date', 'asc'], ['id', 'asc']])
            ->map(fn ($payment) => [
                'id' => $payment->id,
                'date' => $payment->payment_date,
                'method' => $payment->payment_method,
                'amount' => (float) $payment->amount,
                'balance_after' => $payment->balance !== null ? (float) $payment->balance : null,
                'paymongo_payment_id' => $payment->paymongo_payment_id,
                'created_at' => $payment->created_at?->toISOString(),
            ])->values();
        $credits = $order && $order->relationLoaded('creditNotes') ? $order->creditNotes : collect();
        $refunds = $order && $order->relationLoaded('refunds') ? $order->refunds : collect();

        return [
            ...$summary,
            'provider' => [
                'invoice_payment_id' => $invoice->payment_id,
            ],
            'payments' => $payments,
            'credits' => $credits->map(fn ($credit) => [
                'id' => $credit->id,
                'number' => $credit->credit_note_number,
                'status' => $credit->status,
                'amount' => (float) $credit->total_amount,
                'reason' => $credit->reason,
                'issued_at' => $credit->issued_at?->toISOString(),
                'posted_at' => $credit->posted_at?->toISOString(),
            ])->values(),
            'refunds' => $refunds->map(fn ($refund) => [
                'id' => $refund->id,
                'number' => $refund->refund_number,
                'credit_note_id' => $refund->credit_note_id,
                'status' => $refund->status,
                'amount' => (float) $refund->amount,
                'method' => $refund->refund_method,
                'provider_refund_id' => $refund->provider_refund_id,
                'provider_status' => $refund->provider_status,
                'reason' => $refund->reason,
                'approved_at' => $refund->approved_at?->toISOString(),
                'processed_at' => $refund->processed_at?->toISOString(),
                'created_at' => $refund->created_at?->toISOString(),
            ])->values(),
            'passengers' => $this->passengers($invoice),
            'trip_tickets' => $this->tripTickets($invoice),
            'booking_contexts' => $this->detailedBookingContexts($invoice),
            'items_detail' => $this->itemDetails($invoice),
            'payment_schedule' => $invoice->relationLoaded('paymentSchedules')
                ? $invoice->paymentSchedules->map(fn ($schedule) => [
                    'id' => $schedule->id,
                    'installment_number' => (int) $schedule->installment_number,
                    'due_date' => $schedule->due_date,
                    'amount_due' => (float) $schedule->amount_due,
                    'status' => $schedule->status,
                    'notes' => $schedule->notes,
                ])->values()
                : [],
            'itinerary' => $invoice->relationLoaded('itineraries')
                ? $invoice->itineraries->map(fn ($day) => [
                    'id' => $day->id,
                    'day_number' => (int) $day->day_number,
                    'date' => $day->date?->toDateString(),
                    'location' => $day->location,
                    'activity' => $day->activity_description,
                    'meal_plan' => $day->meal_plan,
                    'accommodation' => $day->accommodation_name,
                ])->values()
                : [],
            'notes' => $invoice->notes,
            'created_by' => $invoice->relationLoaded('creator') && $invoice->creator ? [
                'id' => $invoice->creator->id,
                'name' => trim($invoice->creator->first_name.' '.$invoice->creator->last_name),
                'email' => $invoice->creator->email,
            ] : null,
        ];
    }

    private function passengers(Invoice $invoice): array
    {
        $passengers = collect();
        if ($invoice->relationLoaded('passengers')) {
            $passengers = $passengers->merge($invoice->passengers->map(fn ($passenger) => [
                'id' => $passenger->id,
                'source' => 'invoice',
                'name' => $passenger->full_name,
                'first_name' => $passenger->first_name,
                'last_name' => $passenger->last_name,
                'type' => null,
                'date_of_birth' => $passenger->date_of_birth?->toDateString(),
                'passport_number' => $passenger->passport_number,
                'seat_code' => null,
                'emergency_contact' => $passenger->emergency_contact,
                'special_needs' => $passenger->special_needs,
                'dietary_restrictions' => $passenger->dietary_restrictions,
            ]));
        }

        $joiner = $invoice->relationLoaded('joinerReservation') ? $invoice->joinerReservation : null;
        if ($joiner && $joiner->relationLoaded('passengers')) {
            $passengers = $passengers->merge($joiner->passengers->map(fn ($passenger) => [
                'id' => $passenger->id,
                'source' => 'joiner_reservation',
                'name' => trim($passenger->first_name.' '.$passenger->last_name),
                'first_name' => $passenger->first_name,
                'last_name' => $passenger->last_name,
                'type' => $passenger->passenger_type,
                'date_of_birth' => $passenger->date_of_birth?->toDateString(),
                'passport_number' => null,
                'seat_code' => $passenger->seat?->seat_code,
                'emergency_contact' => $passenger->emergency_contact,
                'special_needs' => $passenger->special_needs,
                'dietary_restrictions' => null,
            ]));
        }

        $charter = $invoice->relationLoaded('charterBooking') ? $invoice->charterBooking : null;
        if ($charter && is_array($charter->passengers)) {
            $passengers = $passengers->merge(collect($charter->passengers)
                ->map(fn ($passenger, $index) => $this->normalizePassenger($passenger, 'charter_booking', $index)));
        }

        $education = $invoice->relationLoaded('educationalTourBooking') ? $invoice->educationalTourBooking : null;
        if ($education && is_array($education->passengers)) {
            $passengers = $passengers->merge(collect($education->passengers)
                ->map(fn ($passenger, $index) => $this->normalizePassenger($passenger, 'educational_tour_booking', $index)));
        }

        $participant = $invoice->relationLoaded('educationalTourParticipantBooking') ? $invoice->educationalTourParticipantBooking : null;
        if ($participant) {
            $passengers->push([
                'id' => $participant->id,
                'source' => 'educational_tour_participant',
                'name' => trim("{$participant->participant_first_name} {$participant->participant_last_name}"),
                'first_name' => $participant->participant_first_name,
                'last_name' => $participant->participant_last_name,
                'type' => $participant->grade_level ? "Grade {$participant->grade_level}" : 'Student',
                'date_of_birth' => $participant->date_of_birth,
                'passport_number' => null,
                'seat_code' => $participant->seat_number,
                'emergency_contact' => $participant->emergency_contact_phone ?: $participant->guardian_phone,
                'special_needs' => $participant->medical_or_accessibility_notes,
                'dietary_restrictions' => $participant->dietary_restrictions,
            ]);
        }

        return $passengers
            ->filter(fn (array $passenger) => filled($passenger['name']))
            ->reverse()
            ->unique(fn (array $passenger) => strtolower(trim($passenger['name'])))
            ->reverse()
            ->values()->all();
    }

    private function normalizePassenger(mixed $passenger, string $source, int|string $index): array
    {
        $data = is_array($passenger) ? $passenger : ['name' => (string) $passenger];
        $firstName = Arr::get($data, 'first_name');
        $lastName = Arr::get($data, 'last_name');
        $name = Arr::get($data, 'name')
            ?? Arr::get($data, 'full_name')
            ?? trim(implode(' ', array_filter([$firstName, $lastName])));

        return [
            'id' => Arr::get($data, 'id', $index),
            'source' => $source,
            'name' => $name,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'type' => Arr::get($data, 'passenger_type', Arr::get($data, 'type')),
            'date_of_birth' => Arr::get($data, 'date_of_birth'),
            'passport_number' => Arr::get($data, 'passport_number'),
            'seat_code' => Arr::get($data, 'seat_code', Arr::get($data, 'seat')),
            'emergency_contact' => Arr::get($data, 'emergency_contact'),
            'special_needs' => Arr::get($data, 'special_needs'),
            'dietary_restrictions' => Arr::get($data, 'dietary_restrictions'),
        ];
    }

    private function tripTickets(Invoice $invoice): array
    {
        if (! $invoice->relationLoaded('tripTickets')) {
            return [];
        }

        $tickets = $invoice->tripTickets;
        $participantPackage = $invoice->educationalTourParticipantBooking?->package;
        if ($participantPackage?->relationLoaded('tripTickets')) {
            $tickets = $tickets->merge($participantPackage->tripTickets)->unique('id');
        }

        return $tickets->map(fn ($ticket) => [
            'id' => $ticket->id,
            'control_no' => $ticket->control_no,
            'sales_order_item_id' => $ticket->sales_order_item_id,
            'educational_tour_package_id' => $ticket->educational_tour_package_id,
            'educational_tour_bus_assignment_id' => $ticket->educational_tour_bus_assignment_id,
            'tour_name' => $ticket->tour_name,
            'tour_code' => $ticket->tour_code,
            'assignment_index' => (int) ($ticket->assignment_index ?? 0),
            'status' => $ticket->status,
            'date_of_travel' => $ticket->date_of_travel,
            'duration' => $ticket->duration,
            'pick_up' => $ticket->pick_up,
            'drop_off' => $ticket->drop_off,
            'no_of_passengers' => (int) ($ticket->no_of_passengers ?? 0),
            'vehicle' => $ticket->bus ? [
                'id' => $ticket->bus->id,
                'plate_number' => $ticket->bus->plate_number,
                'model' => $ticket->bus->model,
                'capacity' => (int) $ticket->bus->seating_capacity,
            ] : null,
            'driver' => $ticket->driver ? [
                'id' => $ticket->driver->id,
                'name' => trim($ticket->driver->first_name.' '.$ticket->driver->last_name),
                'phone' => $ticket->driver->phone,
                'email' => $ticket->driver->email,
            ] : null,
        ])->values()->all();
    }

    private function detailedBookingContexts(Invoice $invoice): array
    {
        $contexts = $this->bookingContexts($invoice);

        return $contexts->map(function (array $context) use ($invoice): array {
            if ($context['type'] === 'joiner_tour') {
                $booking = $invoice->joinerReservation;
                $context['details'] = [
                    'passenger_count' => (int) $booking->passenger_count,
                    'starts_at' => $booking->departure?->starts_at?->toISOString(),
                    'ends_at' => $booking->departure?->ends_at?->toISOString(),
                    'pickup' => $booking->departure?->pickup_instructions,
                ];
            } elseif ($context['type'] === 'bus_rental') {
                $booking = $invoice->charterBooking;
                $context['details'] = [
                    'starts_at' => $booking->starts_at?->toISOString(),
                    'ends_at' => $booking->ends_at?->toISOString(),
                    'pickup' => $booking->pickup_location,
                    'destination' => $booking->destination,
                    'passenger_count' => (int) $booking->passenger_count,
                    'vehicle_id' => $booking->bus_id,
                    'driver_id' => $booking->driver_id,
                ];
            } elseif ($context['type'] === 'educational_tour') {
                if ($invoice->relationLoaded('educationalTourParticipantBooking') && $invoice->educationalTourParticipantBooking) {
                    $pb = $invoice->educationalTourParticipantBooking;
                    $pkg = $pb->relationLoaded('package') ? $pb->package : null;
                    $assignment = $pb->relationLoaded('busAssignment') ? $pb->busAssignment : null;
                    $bus = $assignment && $assignment->relationLoaded('bus') ? $assignment->bus : null;
                    $driver = $assignment && $assignment->relationLoaded('driver') ? $assignment->driver : null;
                    $context['details'] = [
                        'school_name' => $pkg?->school_name,
                        'grade_level' => $pb->grade_level ?? $pkg?->grade_level,
                        'starts_at' => $pkg?->starts_at?->toISOString(),
                        'ends_at' => $pkg?->ends_at?->toISOString(),
                        'pickup' => $pkg?->pickup_location,
                        'destination' => $pkg?->destination ?? $pkg?->name,
                        'student_count' => 1,
                        'seat_number' => $pb->seat_number,
                        'vehicles' => $bus ? [[
                            'bus_id' => $bus->id,
                            'plate_number' => $bus->plate_number,
                            'driver_id' => $driver?->id,
                            'driver_name' => $driver ? trim($driver->first_name.' '.$driver->last_name) : null,
                            'planned_passengers' => 1,
                        ]] : [],
                    ];
                } elseif ($invoice->relationLoaded('educationalTourBooking') && $invoice->educationalTourBooking) {
                    $booking = $invoice->educationalTourBooking;
                    $context['details'] = [
                        'school_name' => $booking->school_name,
                        'grade_level' => $booking->grade_level,
                        'starts_at' => $booking->starts_at?->toISOString(),
                        'ends_at' => $booking->ends_at?->toISOString(),
                        'pickup' => $booking->pickup_location,
                        'student_count' => (int) $booking->student_count,
                        'chaperone_count' => (int) $booking->chaperone_count,
                        'vehicles' => $booking->vehicles->map(fn ($assignment) => [
                            'bus_id' => $assignment->bus_id,
                            'plate_number' => $assignment->bus?->plate_number,
                            'driver_id' => $assignment->driver_id,
                            'driver_name' => $assignment->driver
                                ? trim($assignment->driver->first_name.' '.$assignment->driver->last_name)
                                : null,
                            'planned_passengers' => (int) $assignment->planned_passengers,
                        ])->values(),
                    ];
                }
            } elseif ($context['type'] === 'private_tour') {
                $item = $invoice->salesOrder?->items?->firstWhere('id', $context['parent_id']);
                $fulfillment = $item?->fulfillment;
                $context['details'] = $fulfillment instanceof PrivateTourBooking ? [
                    'package_name' => $fulfillment->package_name,
                    'destination' => $fulfillment->destination,
                    'starts_at' => $fulfillment->starts_at?->toISOString(),
                    'ends_at' => $fulfillment->ends_at?->toISOString(),
                    'pickup' => $fulfillment->pickup_location,
                    'passenger_count' => (int) $fulfillment->passenger_count,
                    'adult_count' => (int) $fulfillment->adult_count,
                    'child_count' => (int) $fulfillment->child_count,
                    'vehicle_id' => $fulfillment->bus_id,
                    'driver_id' => $fulfillment->driver_id,
                ] : $context['context'];
            }

            return $context;
        })->values()->all();
    }

    private function itemDetails(Invoice $invoice): array
    {
        $order = $invoice->relationLoaded('salesOrder') ? $invoice->salesOrder : null;
        if ($order && $order->relationLoaded('items')) {
            return $order->items->map(function ($item): array {
                $source = $item->fulfillment?->toArray() ?? $item->details_snapshot ?? [];

                return [
                    'id' => $item->id,
                    'line_number' => (int) $item->line_number,
                    'service_id' => $item->service_id,
                    'service_type' => $item->service_type,
                    'title' => $item->title,
                    'description' => $item->description,
                    'status' => $item->status,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                    'tax' => (float) $item->tax_amount,
                    'total' => (float) $item->total_amount,
                    'scheduled_start' => $item->scheduled_start?->toISOString(),
                    'scheduled_end' => $item->scheduled_end?->toISOString(),
                    'traveler_count' => $item->traveler_count !== null ? (int) $item->traveler_count : null,
                    'fulfillment' => [
                        'type' => $item->fulfillment_type,
                        'id' => $item->fulfillment_id,
                    ],
                    'operational_summary' => Arr::only($source, $this->operationalKeys()),
                ];
            })->values()->all();
        }

        return $invoice->items->map(fn ($item) => [
            'id' => $item->id,
            'line_number' => null,
            'service_id' => $item->service_id,
            'service_type' => $item->service_type ?? $item->service?->service_type,
            'title' => $item->item_name ?? $item->service?->name ?? 'Service',
            'description' => $item->item_description,
            'status' => $invoice->status,
            'quantity' => (float) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'subtotal' => (float) $item->total_price,
            'tax' => null,
            'total' => (float) $item->total_price,
            'scheduled_start' => null,
            'scheduled_end' => null,
            'traveler_count' => ($item->adults !== null || $item->children !== null)
                ? (int) $item->adults + (int) $item->children
                : null,
            'fulfillment' => null,
            'operational_summary' => Arr::only($item->item_metadata ?? [], $this->operationalKeys()),
        ])->values()->all();
    }

    private function operationalKeys(): array
    {
        return [
            'package_name', 'destination', 'origin', 'pickup_location', 'dropoff_location',
            'pickup_at', 'dropoff_at', 'starts_at', 'ends_at', 'passenger_count',
            'adult_count', 'child_count', 'school_name', 'grade_level', 'student_count',
            'chaperone_count', 'property_name', 'city', 'check_in', 'check_out',
            'room_type', 'room_count', 'airline', 'flight_number', 'booking_reference',
            'confirmation_number', 'provider', 'session_starts_at', 'participant_count',
            'status', 'bus_id', 'driver_id', 'rate_plan_id', 'program_id',
        ];
    }
}
