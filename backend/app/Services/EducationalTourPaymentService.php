<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\EducationalTourBookingPayment;
use App\Models\EducationalTourParticipantBooking;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EducationalTourPaymentService
{
    public function __construct(
        private readonly EducationalTourBusAllocator $busAllocator
    ) {}

    public function recordPayment(
        EducationalTourParticipantBooking $booking,
        array $data,
        ?int $receivedBy = null
    ): array {
        return DB::transaction(function () use ($booking, $data, $receivedBy) {
            $booking = EducationalTourParticipantBooking::lockForUpdate()
                ->with(['invoice', 'package'])
                ->findOrFail($booking->id);

            $invoice = $booking->invoice;
            if (! $invoice) {
                throw ValidationException::withMessages([
                    'booking' => 'No billing invoice found for this participant booking.',
                ]);
            }

            if (in_array($booking->status, ['cancelled', 'expired'], true)) {
                throw ValidationException::withMessages([
                    'booking' => 'Cannot post payment to a cancelled or expired booking.',
                ]);
            }

            $idempotencyKey = $data['idempotency_key'] ?? ('pay-'.uniqid('', true));

            // Check duplicate payment
            $existingPayment = EducationalTourBookingPayment::where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if ($existingPayment) {
                if ($existingPayment->booking_id !== $booking->id) {
                    throw ValidationException::withMessages([
                        'idempotency_key' => 'This idempotency key was already used for a different booking.',
                    ]);
                }

                return [
                    'payment' => $existingPayment,
                    'booking' => $booking->fresh(['invoice', 'busAssignment.bus']),
                    'duplicate' => true,
                ];
            }

            $paymentAmount = round((float) $data['amount'], 2);
            if ($paymentAmount <= 0) {
                throw ValidationException::withMessages(['amount' => 'Payment amount must be greater than zero.']);
            }

            $collection = Collection::firstOrCreate(
                ['invoice_id' => $invoice->id],
                [
                    'customer_id' => $invoice->customer_id,
                    'client_name' => $invoice->customer_name ?: 'Walk-in Customer',
                    'date' => $invoice->created_at?->toDateString() ?: now()->toDateString(),
                    'travel_date' => $booking->package?->starts_at?->toDateString()
                        ?: $invoice->due_date?->toDateString()
                        ?: now()->toDateString(),
                    'pick_up' => $booking->package?->pickup_location,
                    'drop_off' => $booking->package?->destination ?? $booking->package?->name,
                    'service_type' => 'Educational Tour',
                    'billing_amount' => $invoice->total_amount,
                    'rate' => $invoice->total_amount,
                    'paid_amount' => 0,
                    'remaining_balance' => $invoice->total_amount,
                    'collection_status' => 'pending',
                    'due_date' => $invoice->due_date,
                    'auto_generated' => true,
                ]
            );

            // PostgreSQL does not allow FOR UPDATE on aggregate queries. Lock the
            // individual payment rows first, then total the locked result in memory.
            $postedSum = (float) $collection->payments()
                ->lockForUpdate()
                ->get(['amount'])
                ->sum('amount');
            $remaining = max(0, round((float) $invoice->total_amount - $postedSum, 2));

            if ($remaining <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'This booking invoice is already fully paid.',
                ]);
            }

            if ($paymentAmount > $remaining) {
                throw ValidationException::withMessages([
                    'amount' => "Payment amount (₱{$paymentAmount}) exceeds the remaining balance of ₱{$remaining}.",
                ]);
            }

            $paymentKind = $data['payment_kind'] ?? 'full';
            $package = $booking->package;

            if ($paymentKind === 'down_payment' && $package->down_payment_amount) {
                if ($paymentAmount < (float) $package->down_payment_amount && $paymentAmount < $remaining) {
                    throw ValidationException::withMessages([
                        'amount' => "Down payment must be at least ₱{$package->down_payment_amount}.",
                    ]);
                }
            }

            $paidAt = ! empty($data['paid_at']) ? Carbon::parse($data['paid_at']) : Carbon::now(config('app.timezone', 'Asia/Manila'));

            // Create immutable collection payment
            $collectionPayment = $collection->payments()->create([
                'payment_date' => $paidAt->toDateString(),
                'payment_method' => $data['payment_method'] ?? 'Cash',
                'amount' => $paymentAmount,
                'balance' => max(0, round($remaining - $paymentAmount, 2)),
                'idempotency_key' => $idempotencyKey,
            ]);

            $collection->recalculate();
            $invoice->refresh();

            $paymentRef = SalesReferenceService::generate('PAY-EDT', $booking->reference, now());

            $bookingPayment = EducationalTourBookingPayment::create([
                'reference' => $paymentRef,
                'booking_id' => $booking->id,
                'collection_payment_id' => $collectionPayment->id,
                'installment_number' => $data['installment_number'] ?? null,
                'payment_kind' => $paymentKind,
                'payment_method' => $data['payment_method'] ?? 'Cash',
                'amount' => $paymentAmount,
                'currency' => $booking->currency,
                'status' => 'posted',
                'provider_reference' => $data['provider_reference'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'paid_at' => $paidAt,
                'posted_at' => now(),
                'received_by' => $receivedBy,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update booking payment and lifecycle status
            $newBalance = (float) $invoice->balance;
            if ($newBalance <= 0) {
                $booking->update([
                    'payment_status' => 'paid',
                    'status' => 'confirmed',
                    'confirmed_at' => $booking->confirmed_at ?? now(),
                    'slot_expires_at' => null,
                ]);
            } else {
                $booking->update([
                    'payment_status' => 'partial',
                    'status' => 'partially_paid',
                    'slot_expires_at' => null, // qualifying payment removes expiry
                ]);
            }

            // Allocate bus seat if available and not yet allocated
            $this->busAllocator->allocate($booking);

            return [
                'payment' => $bookingPayment,
                'booking' => $booking->fresh(['invoice', 'busAssignment.bus', 'package']),
                'duplicate' => false,
            ];
        });
    }

    public function formatPaymentResponse(
        EducationalTourBookingPayment $payment,
        EducationalTourParticipantBooking $booking
    ): array {
        return [
            'payment_reference' => $payment->reference,
            'booking_reference' => $booking->reference,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'payment_kind' => $payment->payment_kind,
            'payment_method' => $payment->payment_method,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'billing' => [
                'total' => (float) $booking->amount_due,
                'paid' => (float) ($booking->invoice?->amount_received ?? 0),
                'balance' => (float) ($booking->invoice?->balance ?? 0),
                'payment_status' => $booking->payment_status,
            ],
            'booking_status' => $booking->status,
            'allocation' => [
                'status' => $booking->bus_assignment_id ? 'allocated' : 'pending',
                'bus_number' => $booking->busAssignment?->sequence_number,
                'bus_plate' => $booking->busAssignment?->bus?->plate_number,
                'seat_number' => $booking->seat_number,
            ],
        ];
    }
}
