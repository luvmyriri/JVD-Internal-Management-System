<?php

namespace App\Services;

use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerPassenger;
use App\Models\JoinerReservation;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\SalesReferenceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class JoinerReservationService
{
    public function releaseExpired(JoinerDeparture $departure): void
    {
        DB::transaction(function () use ($departure) {
            $expired = JoinerReservation::where('departure_id', $departure->id)
                ->where('status', 'held')
                ->whereNotNull('hold_expires_at')
                ->where('hold_expires_at', '<', now())
                ->lockForUpdate()
                ->get();

            foreach ($expired as $reservation) {
                JoinerDepartureSeat::where('reservation_id', $reservation->id)
                    ->update(['reservation_id' => null, 'status' => 'available', 'held_until' => null]);
                $reservation->update(['status' => 'expired']);
            }

            if ($expired->isNotEmpty()) {
                $this->recount($departure->fresh());
            }
        });
    }

    public function hold(JoinerDeparture $departure, array $data, int $actorId): JoinerReservation
    {
        $this->releaseExpired($departure);

        return DB::transaction(function () use ($departure, $data, $actorId) {
            $lockedDeparture = JoinerDeparture::lockForUpdate()->findOrFail($departure->id);

            if ($lockedDeparture->status !== 'published') {
                throw ValidationException::withMessages(['departure' => 'This departure is not open for sale.']);
            }
            if ($lockedDeparture->booking_cutoff_at->isPast() || $lockedDeparture->starts_at->isPast()) {
                throw ValidationException::withMessages(['departure' => 'The booking cutoff for this departure has passed.']);
            }

            $seatCodes = array_values(array_unique($data['seat_codes']));
            if (count($seatCodes) !== (int) $data['passenger_count']) {
                throw ValidationException::withMessages(['seat_codes' => 'Select exactly one unique seat for every passenger.']);
            }

            $seats = JoinerDepartureSeat::where('departure_id', $lockedDeparture->id)
                ->whereIn('seat_code', $seatCodes)
                ->lockForUpdate()
                ->get();

            if ($seats->count() !== count($seatCodes) || $seats->contains(fn ($seat) => $seat->status !== 'available')) {
                throw ValidationException::withMessages(['seat_codes' => 'One or more selected seats are no longer available.']);
            }

            $expiresAt = now()->addMinutes(15);
            // Generate a human-readable reference from the departure's service name and date
            $serviceName = $lockedDeparture->service()->value('name');
            $reservation = JoinerReservation::create([
                'departure_id' => $lockedDeparture->id,
                'customer_id' => $data['customer_id'] ?? null,
                'reference' => SalesReferenceService::generate('JNR', $serviceName, $lockedDeparture->starts_at),
                'lead_name' => $data['lead_name'],
                'lead_email' => $data['lead_email'] ?? null,
                'lead_contact' => $data['lead_contact'] ?? null,
                'passenger_count' => $data['passenger_count'],
                'status' => 'held',
                'hold_expires_at' => $expiresAt,
                'created_by' => $actorId,
            ]);

            JoinerDepartureSeat::whereIn('id', $seats->pluck('id'))->update([
                'reservation_id' => $reservation->id,
                'status' => 'held',
                'held_until' => $expiresAt,
            ]);
            $this->recount($lockedDeparture);

            return $reservation->load(['departure.service', 'seats']);
        });
    }

    public function confirm(JoinerReservation $reservation, array $passengers, array $checkout): JoinerReservation
    {
        $confirmed = DB::transaction(function () use ($reservation, $passengers, $checkout): JoinerReservation {
            $locked = JoinerReservation::lockForUpdate()->findOrFail($reservation->id);
            $departure = JoinerDeparture::lockForUpdate()->findOrFail($locked->departure_id);
            $seats = JoinerDepartureSeat::where('reservation_id', $locked->id)->lockForUpdate()->get()->keyBy('seat_code');

            if ($locked->status === 'confirmed' && $locked->invoice_id) {
                return $locked->load(['departure.service', 'departure.bus', 'passengers.seat', 'invoice']);
            }
            if ($locked->status !== 'held' || ($locked->hold_expires_at && $locked->hold_expires_at->isPast())) {
                throw ValidationException::withMessages(['reservation' => 'This seat hold is no longer active.']);
            }
            if (count($passengers) !== $locked->passenger_count) {
                throw ValidationException::withMessages(['passengers' => 'Passenger details must match the reserved seat count.']);
            }

            $submittedCodes = collect($passengers)->pluck('seat_code');
            if ($submittedCodes->unique()->count() !== count($passengers) || $submittedCodes->diff($seats->keys())->isNotEmpty()) {
                throw ValidationException::withMessages(['passengers' => 'Every passenger must use one of the held seats exactly once.']);
            }

            foreach ($passengers as $passenger) {
                JoinerPassenger::create([
                    'reservation_id' => $locked->id,
                    'departure_seat_id' => $seats[$passenger['seat_code']]->id,
                    'first_name' => $passenger['first_name'],
                    'last_name' => $passenger['last_name'],
                    'passenger_type' => $passenger['passenger_type'],
                    'date_of_birth' => $passenger['date_of_birth'] ?? null,
                    'emergency_contact' => $passenger['emergency_contact'] ?? null,
                    'special_needs' => $passenger['special_needs'] ?? null,
                ]);
            }

            $service = $departure->service()->lockForUpdate()->firstOrFail();
            $adultCount = collect($passengers)->where('passenger_type', 'adult')->count();
            $childCount = collect($passengers)->where('passenger_type', 'child')->count();
            $adultUnitPrice = (float) ($service->adult_price ?: $service->price);
            $childUnitPrice = $service->child_price !== null
                ? (float) $service->child_price
                : $adultUnitPrice;
            $subtotal = round(($adultUnitPrice * $adultCount) + ($childUnitPrice * $childCount), 2);
            $unitPrice = $locked->passenger_count > 0 ? round($subtotal / $locked->passenger_count, 2) : 0;
            $taxRate = (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
            $taxAmount = round($subtotal * $taxRate, 2);
            $total = round($subtotal + $taxAmount, 2);
            $received = (float) $checkout['amount_received'];

            if ($checkout['payment_method'] === 'Cash' && $checkout['payment_type'] === 'full' && $received < $total) {
                throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the invoice total.']);
            }
            if ($checkout['payment_type'] === 'downpayment' && $received <= 0) {
                throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);
            }

            $finalizer = app(InvoiceFinalizationService::class);
            $customerId = $finalizer->resolveCustomerId(
                $locked->customer_id,
                $locked->lead_name,
                $locked->lead_email,
                $locked->lead_contact,
                null
            );
            $payment = $finalizer->computePaymentStatus($checkout['payment_method'], $checkout['payment_type'], $total, $received);

            $invoice = Invoice::create([
                'invoice_number' => SalesReferenceService::generate('INV', $departure->service()->value('name'), now()),
                'customer_id' => $customerId,
                'customer_name' => $locked->lead_name,
                'customer_email' => $locked->lead_email,
                'customer_contact' => $locked->lead_contact,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $total,
                'amount_received' => $received,
                'change' => max(0, $received - $total),
                'payment_method' => $checkout['payment_method'],
                'payment_type' => $checkout['payment_type'],
                'balance' => $payment['balance'],
                'due_date' => $checkout['due_date'] ?? $departure->starts_at->toDateString(),
                'status' => $payment['status'],
                'created_by' => $locked->created_by,
                'notes' => trim("Joiner reservation {$locked->reference}. ".($checkout['notes'] ?? '')),
            ]);
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'service_id' => $service->id,
                'quantity' => $locked->passenger_count,
                'unit_price' => $unitPrice,
                'total_price' => $subtotal,
                'adults' => $adultCount,
                'children' => $childCount,
                'adult_price' => $adultUnitPrice,
                'child_price' => $childUnitPrice,
            ]);

            $invoice = $finalizer->finalizeWithinTransaction($invoice, [[
                'service_id' => $service->id, 'quantity' => $locked->passenger_count, 'unit_price' => $unitPrice,
                'adults' => $adultCount, 'children' => $childCount,
                'adult_price' => $adultUnitPrice, 'child_price' => $childUnitPrice,
            ]]);

            JoinerDepartureSeat::where('reservation_id', $locked->id)->update(['status' => 'confirmed', 'held_until' => null]);
            $locked->update(['status' => 'confirmed', 'hold_expires_at' => null, 'invoice_id' => $invoice->id, 'customer_id' => $customerId]);
            $this->recount($departure);

            return $locked->load(['departure.service', 'departure.bus', 'passengers.seat', 'invoice.items']);
        });

        app(InvoiceFinalizationService::class)->afterCommit($confirmed->invoice, [
            'actor' => \App\Models\User::find($confirmed->created_by), 'source' => 'sales',
        ]);

        return $confirmed->fresh(['departure.service', 'departure.bus', 'passengers.seat', 'invoice.items']);
    }

    private function recount(JoinerDeparture $departure): void
    {
        $counts = JoinerDepartureSeat::where('departure_id', $departure->id)
            ->selectRaw("SUM(CASE WHEN status = 'held' THEN 1 ELSE 0 END) as held_count")
            ->selectRaw("SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count")
            ->first();

        $departure->update([
            'held_count' => (int) ($counts->held_count ?? 0),
            'confirmed_count' => (int) ($counts->confirmed_count ?? 0),
        ]);
    }
}
