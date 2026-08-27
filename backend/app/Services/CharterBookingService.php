<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\CharterRatePlan;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\PmsSchedule;
use App\Models\SalesOrderItem;
use App\Models\SystemSetting;
use App\Models\TripTicket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CharterBookingService
{
    public function calculate(CharterRatePlan $plan, string $startsAt, string $endsAt, float $kilometers, ?bool $isFixedRate = null): array
    {
        $start = Carbon::parse($startsAt);
        $end = Carbon::parse($endsAt);
        $hours = max(1, (int) ceil($start->floatDiffInHours($end)));
        $overnights = max(0, (int) $start->startOfDay()->diffInDays($end->copy()->startOfDay()));
        $base = (float) $plan->base_price;

        $fixed = $isFixedRate ?? true;
        $extraHours = (! $fixed && $plan->included_hours !== null) ? max(0, $hours - (int) $plan->included_hours) : 0;
        $extraKilometers = (! $fixed && $plan->included_kilometers !== null) ? max(0, (int) ceil($kilometers - (float) $plan->included_kilometers)) : 0;
        $extraHoursAmount = $extraHours * (float) ($plan->extra_hour_rate ?? 0);
        $extraKilometersAmount = $extraKilometers * (float) ($plan->extra_kilometer_rate ?? 0);
        $overnightAmount = (! $fixed) ? $overnights * (float) ($plan->overnight_rate ?? 0) : 0.0;
        $subtotal = $base + $extraHoursAmount + $extraKilometersAmount + $overnightAmount;

        return [
            'duration_hours' => $hours,
            'estimated_kilometers' => $kilometers,
            'extra_hours' => $extraHours,
            'extra_kilometers' => $extraKilometers,
            'overnights' => $overnights,
            'base_price' => $base,
            'extra_hours_amount' => $extraHoursAmount,
            'extra_kilometers_amount' => $extraKilometersAmount,
            'overnight_amount' => $overnightAmount,
            'is_fixed_rate' => $fixed,
            'subtotal' => round($subtotal, 2),
        ];
    }

    public function create(array $data, int $actorId): CharterBooking
    {
        $booking = DB::transaction(function () use ($data, $actorId) {
            $plan = CharterRatePlan::where('is_active', true)->lockForUpdate()->findOrFail($data['rate_plan_id']);
            $bus = Bus::lockForUpdate()->findOrFail($data['bus_id']);
            $driver = ! empty($data['driver_id']) ? User::lockForUpdate()->findOrFail($data['driver_id']) : null;

            if ($bus->status !== 'available') {
                throw ValidationException::withMessages(['bus_id' => 'The selected vehicle is not in available status.']);
            }
            if (strtolower($bus->vehicle_type ?? 'bus') !== strtolower($plan->vehicle_class)) {
                throw ValidationException::withMessages(['bus_id' => "Select a {$plan->vehicle_class} for this rate plan."]);
            }
            if ($data['passenger_count'] > $bus->seating_capacity) {
                throw ValidationException::withMessages(['passenger_count' => "Passenger count exceeds the vehicle's {$bus->seating_capacity} seats."]);
            }
            if ($driver && ($driver->role !== 'driver' || ! $driver->is_active)) {
                throw ValidationException::withMessages(['driver_id' => 'Select an active driver.']);
            }
            if ($plan->includes_driver && ! $driver) {
                throw ValidationException::withMessages(['driver_id' => 'This rate plan includes a driver; assign an available driver before confirmation.']);
            }
            $this->assertAvailable($bus->id, $driver?->id, $data['starts_at'], $data['ends_at']);

            $pricing = $this->calculate($plan, $data['starts_at'], $data['ends_at'], (float) $data['estimated_kilometers'], isset($data['is_fixed_rate']) ? (bool) $data['is_fixed_rate'] : null);
            $taxRate = (float) SystemSetting::getValue('vat_rate', 0.12);
            $tax = round($pricing['subtotal'] * $taxRate, 2);
            $total = round($pricing['subtotal'] + $tax, 2);
            $received = (float) $data['amount_received'];
            if ($data['payment_method'] === 'Cash' && $data['payment_type'] === 'full' && $received < $total) {
                throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the invoice total.']);
            }
            if ($data['payment_type'] === 'downpayment' && $received <= 0) {
                throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);
            }

            $finalizer = app(InvoiceFinalizationService::class);
            $customerId = $finalizer->resolveCustomerId($data['customer_id'] ?? null, $data['lead_name'], $data['lead_email'] ?? null, $data['lead_contact'] ?? null, null);
            $payment = $finalizer->computePaymentStatus($data['payment_method'], $data['payment_type'], $total, $received);
            $invoice = Invoice::create([
                'invoice_number' => SalesReferenceService::generate('INV', $data['destination'] ?? null, now()), 'customer_id' => $customerId,
                'customer_name' => $data['lead_name'], 'customer_email' => $data['lead_email'] ?? null, 'customer_contact' => $data['lead_contact'] ?? null,
                'subtotal' => $pricing['subtotal'], 'tax_amount' => $tax, 'total_amount' => $total, 'amount_received' => $received,
                'change' => max(0, $received - $total), 'payment_method' => $data['payment_method'], 'payment_type' => $data['payment_type'],
                'balance' => $payment['balance'], 'due_date' => $data['due_date'] ?? Carbon::parse($data['starts_at'])->toDateString(),
                'status' => $payment['status'], 'created_by' => $actorId, 'notes' => 'Exclusive charter booking.',
            ]);
            InvoiceItem::create(['invoice_id' => $invoice->id, 'service_id' => $plan->service_id, 'quantity' => 1, 'unit_price' => $pricing['subtotal'], 'total_price' => $pricing['subtotal']]);
            $invoice = $finalizer->finalizeWithinTransaction($invoice, [[
                'service_id' => $plan->service_id, 'quantity' => 1, 'unit_price' => $pricing['subtotal'],
            ]]);

            $booking = CharterBooking::create([
                'reference' => SalesReferenceService::generate('CHR', $data['destination'] ?? null, $data['starts_at']), 'rate_plan_id' => $plan->id, 'customer_id' => $customerId, 'invoice_id' => $invoice->id,
                'bus_id' => $bus->id, 'driver_id' => $driver?->id, 'lead_name' => $data['lead_name'], 'lead_email' => $data['lead_email'] ?? null,
                'lead_contact' => $data['lead_contact'] ?? null, 'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                'pickup_location' => $data['pickup_location'], 'destination' => $data['destination'], 'stops' => $data['stops'] ?? [],
                'passenger_count' => $data['passenger_count'], 'estimated_kilometers' => $data['estimated_kilometers'],
                'booking_mode' => $data['booking_mode'] ?? 'entire_vehicle', 'selected_seats' => $data['selected_seats'] ?? [],
                'passengers' => $data['passengers'] ?? [],
                'fleet_assignments' => [[
                    'bus_id' => $bus->id,
                    'driver_id' => $driver?->id,
                    'plate_number' => $bus->plate_number,
                    'model' => $bus->model,
                    'seating_capacity' => $bus->seating_capacity,
                    'driver_name' => $driver ? trim($driver->first_name.' '.$driver->last_name) : null,
                    'driver_phone' => $driver?->phone,
                ]],
                'base_price' => $pricing['base_price'], 'extra_hours_amount' => $pricing['extra_hours_amount'],
                'extra_kilometers_amount' => $pricing['extra_kilometers_amount'], 'overnight_amount' => $pricing['overnight_amount'],
                'subtotal' => $pricing['subtotal'], 'pricing_snapshot' => [...$pricing, 'rate_plan' => $this->ratePlanSnapshot($plan)],
                'status' => 'confirmed', 'operations_notes' => $data['operations_notes'] ?? null, 'created_by' => $actorId,
            ]);
            app(ResourceAllocationService::class)->reserve($booking, $bus->id, $driver?->id, $booking->starts_at, $booking->ends_at, $booking->reference);

            return $booking->load(['ratePlan.service', 'bus', 'driver', 'invoice.items']);
        });

        app(InvoiceFinalizationService::class)->afterCommit($booking->invoice, [
            'actor' => User::find($actorId), 'source' => 'sales',
        ]);

        return $booking->fresh(['ratePlan.service', 'bus', 'driver', 'invoice.items']);
    }

    public function update(CharterBooking $booking, array $data): CharterBooking
    {
        $updated = DB::transaction(function () use ($booking, $data) {
            $booking = CharterBooking::lockForUpdate()->with('ratePlan')->findOrFail($booking->id);
            if (! in_array($booking->status, ['confirmed', 'awaiting_payment', 'in_progress'], true)) {
                throw ValidationException::withMessages(['booking' => 'Only active charter bookings can be edited.']);
            }

            $assignmentInput = $data['assignments'] ?? [['bus_id' => $data['bus_id'], 'driver_id' => $data['driver_id'] ?? null]];
            $assignments = $this->validateAssignments($booking->ratePlan, $assignmentInput, (int) $data['passenger_count']);
            [$bus, $driver] = $assignments[0];
            if (($data['booking_mode'] ?? null) === 'selected_seats' && count($data['selected_seats'] ?? []) > (int) $data['passenger_count']) {
                throw ValidationException::withMessages(['selected_seats' => 'Selected seats cannot exceed the passenger count.']);
            }

            $allocation = app(ResourceAllocationService::class);
            $allocation->release($booking);
            foreach ($assignments as [$assignedBus, $assignedDriver]) {
                $allocation->reserve($booking, $assignedBus->id, $assignedDriver?->id, $data['starts_at'], $data['ends_at'], $booking->reference);
            }

            $booking->update([
                'lead_name' => $data['lead_name'],
                'lead_email' => $data['lead_email'] ?? null,
                'lead_contact' => $data['lead_contact'] ?? null,
                'bus_id' => $bus->id,
                'driver_id' => $driver?->id,
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'pickup_location' => $data['pickup_location'],
                'destination' => $data['destination'],
                'stops' => $data['stops'] ?? [],
                'passenger_count' => $data['passenger_count'],
                'booking_mode' => $data['booking_mode'],
                'selected_seats' => $data['selected_seats'] ?? [],
                'passengers' => $data['passengers'] ?? [],
                'fleet_assignments' => collect($assignments)->map(fn ($assignment) => [
                    'bus_id' => $assignment[0]->id,
                    'driver_id' => $assignment[1]?->id,
                    'plate_number' => $assignment[0]->plate_number,
                    'model' => $assignment[0]->model,
                    'seating_capacity' => $assignment[0]->seating_capacity,
                    'driver_name' => $assignment[1] ? trim($assignment[1]->first_name.' '.$assignment[1]->last_name) : null,
                    'driver_phone' => $assignment[1]?->phone,
                ])->all(),
                'operations_notes' => $data['operations_notes'] ?? null,
            ]);

            return $booking->fresh(['ratePlan.service', 'bus', 'driver', 'invoice.items']);
        });

        $orderItem = SalesOrderItem::where('fulfillment_type', $updated->getMorphClass())
            ->where('fulfillment_id', $updated->id)
            ->first();
        if ($orderItem) {
            app(TripTicketService::class)->synchronizeForSalesItem($orderItem, $updated->created_by);
        }

        return $updated->fresh(['ratePlan.service', 'bus', 'driver', 'invoice.items']);
    }

    public function createFromInvoice(Invoice $invoice, array $data, int $actorId): CharterBooking
    {
        $plan = CharterRatePlan::where('is_active', true)->lockForUpdate()->findOrFail($data['rate_plan_id']);
        $assignmentInput = $data['assignments'] ?? [['bus_id' => $data['bus_id'], 'driver_id' => $data['driver_id'] ?? null]];
        $assignments = $this->validateAssignments($plan, $assignmentInput, (int) $data['passenger_count']);
        foreach ($assignments as [$assignedBus, $assignedDriver]) {
            $this->assertAvailable($assignedBus->id, $assignedDriver?->id, $data['starts_at'], $data['ends_at']);
        }
        [$bus, $driver] = $assignments[0];
        $isFixedRate = array_key_exists('is_fixed_rate', $data) && $data['is_fixed_rate'] !== null
            ? (bool) $data['is_fixed_rate']
            : null;
        $pricing = $this->calculate($plan, $data['starts_at'], $data['ends_at'], (float) $data['estimated_kilometers'], $isFixedRate);

        $booking = CharterBooking::create([
            'reference' => SalesReferenceService::generate('CHR', $data['destination'], $data['starts_at']),
            'rate_plan_id' => $plan->id, 'customer_id' => $invoice->customer_id, 'invoice_id' => $invoice->id,
            'bus_id' => $bus->id, 'driver_id' => $driver?->id, 'lead_name' => $invoice->customer_name,
            'lead_email' => $invoice->customer_email, 'lead_contact' => $invoice->customer_contact,
            'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'], 'pickup_location' => $data['pickup_location'],
            'destination' => $data['destination'], 'stops' => $data['stops'] ?? [], 'passenger_count' => $data['passenger_count'],
            'booking_mode' => $data['booking_mode'] ?? 'entire_vehicle', 'selected_seats' => $data['selected_seats'] ?? [],
            'passengers' => $data['passengers'] ?? [], 'estimated_kilometers' => $data['estimated_kilometers'],
            'fleet_assignments' => collect($assignments)->map(fn ($assignment) => [
                'bus_id' => $assignment[0]->id,
                'driver_id' => $assignment[1]?->id,
                'plate_number' => $assignment[0]->plate_number,
                'model' => $assignment[0]->model,
                'seating_capacity' => $assignment[0]->seating_capacity,
                'driver_name' => $assignment[1] ? trim($assignment[1]->first_name.' '.$assignment[1]->last_name) : null,
                'driver_phone' => $assignment[1]?->phone,
            ])->all(),
            'base_price' => $pricing['base_price'], 'extra_hours_amount' => $pricing['extra_hours_amount'],
            'extra_kilometers_amount' => $pricing['extra_kilometers_amount'], 'overnight_amount' => $pricing['overnight_amount'],
            'subtotal' => $invoice->subtotal, 'pricing_snapshot' => [...$pricing, 'rate_plan' => $this->ratePlanSnapshot($plan), 'invoice_subtotal' => (float) $invoice->subtotal, 'requested_units' => (int) ($data['requested_units'] ?? count($assignments))],
            'status' => 'confirmed', 'operations_notes' => $data['operations_notes'] ?? null, 'created_by' => $actorId,
        ]);
        foreach ($assignments as [$assignedBus, $assignedDriver]) {
            app(ResourceAllocationService::class)->reserve($booking, $assignedBus->id, $assignedDriver?->id, $booking->starts_at, $booking->ends_at, $booking->reference);
        }

        return $booking;
    }

    private function validateAssignments(CharterRatePlan $plan, array $assignmentInput, int $passengerCount): array
    {
        if ($assignmentInput === []) {
            throw ValidationException::withMessages(['assignments' => 'Assign at least one vehicle.']);
        }
        $busIds = collect($assignmentInput)->pluck('bus_id')->filter();
        if ($busIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['assignments' => 'A vehicle can only be assigned once.']);
        }
        $driverIds = collect($assignmentInput)->pluck('driver_id')->filter();
        if ($driverIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['assignments' => 'A driver can only be assigned once.']);
        }
        $assignments = [];
        $totalCapacity = 0;
        foreach ($assignmentInput as $index => $assignment) {
            $bus = Bus::lockForUpdate()->findOrFail($assignment['bus_id']);
            $driver = ! empty($assignment['driver_id']) ? User::lockForUpdate()->findOrFail($assignment['driver_id']) : null;
            if ($bus->status !== 'available') {
                throw ValidationException::withMessages(["assignments.$index.bus_id" => 'The selected vehicle is not in available status.']);
            }
            if (strtolower($bus->vehicle_type ?? 'bus') !== strtolower($plan->vehicle_class)) {
                throw ValidationException::withMessages(["assignments.$index.bus_id" => "Select a {$plan->vehicle_class} for this rate plan."]);
            }
            if ($driver && ($driver->role !== 'driver' || ! $driver->is_active)) {
                throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Select an active driver.']);
            }
            if ($plan->includes_driver && ! $driver) {
                throw ValidationException::withMessages(["assignments.$index.driver_id" => 'This rate plan requires a driver for every vehicle.']);
            }
            $totalCapacity += (int) $bus->seating_capacity;
            $assignments[] = [$bus, $driver];
        }
        if ($totalCapacity < $passengerCount) {
            throw ValidationException::withMessages(['passenger_count' => "Passenger count exceeds the selected fleet's {$totalCapacity}-seat capacity."]);
        }

        return $assignments;
    }

    private function ratePlanSnapshot(CharterRatePlan $plan): array
    {
        return $plan->only([
            'id', 'name', 'vehicle_class', 'included_hours', 'included_kilometers',
            'extra_hour_rate', 'extra_kilometer_rate', 'overnight_rate',
            'estimated_liters', 'diesel_price_per_liter', 'diesel_cost', 'driver_meals',
            'toll_gate_fees', 'easytrip', 'autosweep', 'commission', 'desired_profit',
            'total_expenses', 'projected_profit',
        ]);
    }

    public function assertAvailable(int $busId, ?int $driverId, string $startsAt, string $endsAt): void
    {
        $startsAt = Carbon::parse($startsAt)->toDateTimeString();
        $endsAt = Carbon::parse($endsAt)->toDateTimeString();
        $overlap = fn ($query) => $query->where('starts_at', '<', $endsAt)->where('ends_at', '>', $startsAt)->whereNotIn('status', ['cancelled', 'completed']);
        if ($overlap(CharterBooking::where('bus_id', $busId))->exists() || $overlap(JoinerDeparture::where('bus_id', $busId))->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle is already reserved during this interval.']);
        }
        $startDate = Carbon::parse($startsAt)->toDateString();
        $endDate = Carbon::parse($endsAt)->toDateString();
        if (TripTicket::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle has an existing trip ticket during this interval.']);
        }
        if (PmsSchedule::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle has scheduled maintenance during this interval.']);
        }
        if ($driverId && ($overlap(CharterBooking::where('driver_id', $driverId))->exists() || $overlap(JoinerDeparture::where('driver_id', $driverId))->exists())) {
            throw ValidationException::withMessages(['driver_id' => 'Driver is already assigned during this interval.']);
        }
        if ($driverId && TripTicket::where('driver_id', $driverId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['driver_id' => 'Driver has an existing trip ticket during this interval.']);
        }
    }
}
