<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\CharterRatePlan;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CharterBookingService
{
    public function calculate(CharterRatePlan $plan, string $startsAt, string $endsAt, float $kilometers): array
    {
        $start = Carbon::parse($startsAt);
        $end = Carbon::parse($endsAt);
        $hours = max(1, (int) ceil($start->floatDiffInHours($end)));
        $extraHours = max(0, $hours - $plan->included_hours);
        $extraKilometers = max(0, $kilometers - $plan->included_kilometers);
        $overnights = max(0, (int) $start->startOfDay()->diffInDays($end->copy()->startOfDay()));
        $base = (float) $plan->base_price;
        $extraHoursAmount = round($extraHours * (float) $plan->extra_hour_rate, 2);
        $extraKilometersAmount = round($extraKilometers * (float) $plan->extra_kilometer_rate, 2);
        $overnightAmount = round($overnights * (float) $plan->overnight_rate, 2);

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
            'subtotal' => round($base + $extraHoursAmount + $extraKilometersAmount + $overnightAmount, 2),
        ];
    }

    public function create(array $data, int $actorId): CharterBooking
    {
        $booking = DB::transaction(function () use ($data, $actorId) {
            $plan = CharterRatePlan::where('is_active', true)->lockForUpdate()->findOrFail($data['rate_plan_id']);
            $bus = Bus::lockForUpdate()->findOrFail($data['bus_id']);
            $driver = !empty($data['driver_id']) ? User::lockForUpdate()->findOrFail($data['driver_id']) : null;

            if ($bus->status !== 'available') throw ValidationException::withMessages(['bus_id' => 'The selected vehicle is not in available status.']);
            if (($bus->vehicle_type ?? 'bus') !== $plan->vehicle_class) throw ValidationException::withMessages(['bus_id' => "Select a {$plan->vehicle_class} for this rate plan."]);
            if ($data['passenger_count'] > $bus->seating_capacity) throw ValidationException::withMessages(['passenger_count' => "Passenger count exceeds the vehicle's {$bus->seating_capacity} seats."]);
            if ($driver && ($driver->role !== 'driver' || !$driver->is_active)) throw ValidationException::withMessages(['driver_id' => 'Select an active driver.']);
            if ($plan->includes_driver && !$driver) throw ValidationException::withMessages(['driver_id' => 'This rate plan includes a driver; assign an available driver before confirmation.']);
            $this->assertAvailable($bus->id, $driver?->id, $data['starts_at'], $data['ends_at']);

            $pricing = $this->calculate($plan, $data['starts_at'], $data['ends_at'], (float) $data['estimated_kilometers']);
            $taxRate = (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
            $tax = round($pricing['subtotal'] * $taxRate, 2);
            $total = round($pricing['subtotal'] + $tax, 2);
            $received = (float) $data['amount_received'];
            if ($data['payment_method'] === 'Cash' && $data['payment_type'] === 'full' && $received < $total) throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the invoice total.']);
            if ($data['payment_type'] === 'downpayment' && $received <= 0) throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);

            $finalizer = app(InvoiceFinalizationService::class);
            $customerId = $finalizer->resolveCustomerId($data['customer_id'] ?? null, $data['lead_name'], $data['lead_email'] ?? null, $data['lead_contact'] ?? null, null);
            $payment = $finalizer->computePaymentStatus($data['payment_method'], $data['payment_type'], $total, $received);
            $invoice = Invoice::create([
                'invoice_number' => 'INV-'.strtoupper(Str::random(8)), 'customer_id' => $customerId,
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
                'reference' => (string) Str::uuid(), 'rate_plan_id' => $plan->id, 'customer_id' => $customerId, 'invoice_id' => $invoice->id,
                'bus_id' => $bus->id, 'driver_id' => $driver?->id, 'lead_name' => $data['lead_name'], 'lead_email' => $data['lead_email'] ?? null,
                'lead_contact' => $data['lead_contact'] ?? null, 'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                'pickup_location' => $data['pickup_location'], 'destination' => $data['destination'], 'stops' => $data['stops'] ?? [],
                'passenger_count' => $data['passenger_count'], 'estimated_kilometers' => $data['estimated_kilometers'],
                'base_price' => $pricing['base_price'], 'extra_hours_amount' => $pricing['extra_hours_amount'],
                'extra_kilometers_amount' => $pricing['extra_kilometers_amount'], 'overnight_amount' => $pricing['overnight_amount'],
                'subtotal' => $pricing['subtotal'], 'pricing_snapshot' => [...$pricing, 'rate_plan' => $plan->only(['id', 'name', 'vehicle_class', 'included_hours', 'included_kilometers', 'extra_hour_rate', 'extra_kilometer_rate', 'overnight_rate'])],
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
        if (\App\Models\TripTicket::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle has an existing trip ticket during this interval.']);
        }
        if (\App\Models\PmsSchedule::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle has scheduled maintenance during this interval.']);
        }
        if ($driverId && ($overlap(CharterBooking::where('driver_id', $driverId))->exists() || $overlap(JoinerDeparture::where('driver_id', $driverId))->exists())) {
            throw ValidationException::withMessages(['driver_id' => 'Driver is already assigned during this interval.']);
        }
        if ($driverId && \App\Models\TripTicket::where('driver_id', $driverId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['driver_id' => 'Driver has an existing trip ticket during this interval.']);
        }
    }
}
