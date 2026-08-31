<?php

namespace App\Services;

use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePassenger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EducationalTourRegistrationService
{
    public function __construct(
        private readonly EducationalTourBusAllocator $busAllocator,
        private readonly InvoiceFinalizationService $invoiceFinalization,
        private readonly TripTicketService $tripTickets
    ) {}

    public function registerParticipantForPackage(
        EducationalTourPackage $package,
        array $data,
        ?int $actorId = null
    ): array {
        $result = DB::transaction(function () use ($package, $data, $actorId) {
            $package = EducationalTourPackage::lockForUpdate()->findOrFail($package->id);

            if ($package->status !== 'published') {
                throw new HttpException(409, 'Participant bookings can only be added to a published package.');
            }

            $paymentPlan = $data['payment_plan'] ?? 'full';
            $allowedPaymentPlans = match ($package->payment_policy) {
                'full_only' => ['full'],
                'down_payment' => ['full', 'down_payment'],
                'installment' => ['full', 'installment'],
                default => ['full', 'down_payment', 'installment'],
            };
            if (! in_array($paymentPlan, $allowedPaymentPlans, true)) {
                throw ValidationException::withMessages([
                    'payment_plan' => ['The selected payment plan is not available for this package.'],
                ]);
            }

            // Release any holds created before this module became desk-operated.
            EducationalTourParticipantBooking::where('package_id', $package->id)
                ->where('status', 'pending_payment')
                ->whereNotNull('slot_expires_at')
                ->where('slot_expires_at', '<', now())
                ->update([
                    'status' => 'expired',
                    'bus_assignment_id' => null,
                    'seat_number' => null,
                ]);

            $studentNumber = $data['participant']['student_number'] ?? null;

            // A student number identifies a participant within one package and makes desk retries safe.
            if (! empty($studentNumber)) {
                $existingBooking = EducationalTourParticipantBooking::with(['invoice', 'busAssignment.bus'])
                    ->where('package_id', $package->id)
                    ->where('student_number', $studentNumber)
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->lockForUpdate()
                    ->first();

                if ($existingBooking) {
                    return [
                        'booking' => $existingBooking,
                        'package' => $package,
                        'duplicate' => true,
                    ];
                }
            }

            // Locking the package serializes capacity checks across concurrent desk encoders.
            $consumingCount = EducationalTourParticipantBooking::where('package_id', $package->id)
                ->whereIn('status', ['pending_payment', 'partially_paid', 'confirmed', 'completed'])
                ->count();

            if ($consumingCount >= $package->maximum_capacity) {
                throw new HttpException(409, 'PACKAGE_FULL: This educational tour package has reached maximum capacity.');
            }

            $rawType = $data['participant_type'] ?? ($data['participant']['type'] ?? ($data['participant']['participant_type'] ?? ($data['type'] ?? 'student')));
            $participantType = in_array(strtolower((string) $rawType), ['adult', 'companion', 'guardian', 'teacher'], true) ? 'adult' : 'student';

            $ratePerHead = $participantType === 'adult'
                ? (float) ($package->adult_rate_per_head ?? $package->rate_per_head)
                : (float) $package->rate_per_head;

            $subtotal = $ratePerHead;
            $taxAmount = 0.0;
            $amountDue = $ratePerHead;

            $part = $data['participant'];
            $guardian = $data['guardian'] ?? [];
            $emergency = $data['emergency_contact'] ?? [];

            // Check for manual vs automatic seat allocation
            $allocationMode = $data['allocation_mode'] ?? ($data['participant']['allocation_mode'] ?? null);
            $requestedBusAssignmentId = $data['bus_assignment_id'] ?? ($data['participant']['bus_assignment_id'] ?? null);
            $requestedSeatNumber = $data['seat_number'] ?? ($data['participant']['seat_number'] ?? null);

            $isManualSelection = $allocationMode === 'manual' || ! empty($requestedSeatNumber);
            $targetBusAssignment = null;
            $normalizedSeatLabel = null;

            if ($isManualSelection && ! empty($requestedSeatNumber)) {
                if (! empty($requestedBusAssignmentId)) {
                    $targetBusAssignment = EducationalTourBusAssignment::where('package_id', $package->id)
                        ->where(function ($q) use ($requestedBusAssignmentId) {
                            $q->where('id', (int) $requestedBusAssignmentId)
                                ->orWhere('bus_id', (int) $requestedBusAssignmentId);
                        })
                        ->lockForUpdate()
                        ->first();

                    if (! $targetBusAssignment) {
                        throw ValidationException::withMessages([
                            'bus_assignment_id' => ['The selected vehicle assignment does not belong to this educational tour package.'],
                        ]);
                    }
                }

                if (! $targetBusAssignment) {
                    // Default to first bus assignment on the package if single bus or unassigned
                    $targetBusAssignment = EducationalTourBusAssignment::where('package_id', $package->id)
                        ->orderBy('sequence_number')
                        ->lockForUpdate()
                        ->first();
                }

                if (! $targetBusAssignment) {
                    throw ValidationException::withMessages([
                        'seat_number' => ['No bus coach is assigned to this educational tour package to select a seat from.'],
                    ]);
                }

                $this->busAllocator->assertAssignmentAcceptsSection(
                    $targetBusAssignment,
                    $part['section'] ?? null,
                );

                $cleanSeatNum = preg_replace('/^(?:Seat|S)\s*/i', '', trim((string) $requestedSeatNumber));
                $seatIndex = (int) $cleanSeatNum;
                if ($seatIndex < 1 || $seatIndex > $targetBusAssignment->capacity_snapshot) {
                    throw ValidationException::withMessages([
                        'seat_number' => ["The selected seat ({$requestedSeatNumber}) exceeds the vehicle seating capacity of {$targetBusAssignment->capacity_snapshot} seats."],
                    ]);
                }

                $normalizedSeatLabel = "Seat {$cleanSeatNum}";

                // Check for duplicate seat occupancy in active bookings
                $seatAlreadyOccupied = EducationalTourParticipantBooking::where('package_id', $package->id)
                    ->where('bus_assignment_id', $targetBusAssignment->id)
                    ->where(function ($q) use ($normalizedSeatLabel, $cleanSeatNum) {
                        $q->where('seat_number', $normalizedSeatLabel)
                            ->orWhere('seat_number', $cleanSeatNum);
                    })
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->lockForUpdate()
                    ->exists();

                if ($seatAlreadyOccupied) {
                    throw ValidationException::withMessages([
                        'seat_number' => ["The selected seat ({$normalizedSeatLabel}) is already occupied. Please select another seat."],
                    ]);
                }
            }

            $customerName = trim("{$part['first_name']} ".($part['last_name'] ?? ''));
            $customerEmail = $guardian['email'] ?? ($part['email'] ?? null);
            $customerPhone = $guardian['phone'] ?? ($part['phone'] ?? null);

            $customerId = $this->invoiceFinalization->resolveCustomerId(
                null,
                $customerName,
                $customerEmail,
                $customerPhone,
                null
            );

            $invoiceNumber = SalesReferenceService::generate('INV', $package->pickup_location, now());
            $dueDate = $package->balance_due_at ? $package->balance_due_at->toDateString() : $package->starts_at->toDateString();

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_contact' => $customerPhone,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $amountDue,
                'amount_received' => 0.00,
                'change' => 0,
                'payment_method' => $data['payment_method'] ?? 'Bank Transfer',
                'payment_type' => $paymentPlan,
                'balance' => $amountDue,
                'due_date' => $dueDate,
                'status' => 'pending',
                'created_by' => $actorId ?? $package->created_by,
                'notes' => "Educational Tour desk booking for {$customerName} ({$package->tour_code})",
            ]);

            $bookingRef = ! empty($data['booking_reference'])
                ? $data['booking_reference']
                : SalesReferenceService::generate('EDT-BK', $package->tour_code, now());

            $booking = EducationalTourParticipantBooking::create([
                'public_id' => Str::uuid()->toString(),
                'reference' => $bookingRef,
                // Retained only for the current schema; no public route exposes or accepts this value.
                'access_token_hash' => hash('sha256', Str::random(64)),
                'package_id' => $package->id,
                'customer_id' => $customerId,
                'invoice_id' => $invoice->id,
                'participant_first_name' => $part['first_name'],
                'participant_middle_name' => $part['middle_name'] ?? null,
                'participant_last_name' => $part['last_name'],
                'participant_type' => $participantType,
                'student_number' => $studentNumber,
                'grade_level' => $part['grade_level'] ?? $package->grade_level,
                'section' => $part['section'] ?? null,
                'date_of_birth' => $part['date_of_birth'] ?? null,
                'participant_email' => $part['email'] ?? null,
                'participant_phone' => $part['phone'] ?? null,
                'guardian_name' => $guardian['name'] ?? null,
                'guardian_email' => $guardian['email'] ?? null,
                'guardian_phone' => $guardian['phone'] ?? null,
                'emergency_contact_name' => $emergency['name'] ?? ($guardian['name'] ?? null),
                'emergency_contact_phone' => $emergency['phone'] ?? ($guardian['phone'] ?? null),
                'dietary_restrictions' => $part['dietary_restrictions'] ?? null,
                'medical_or_accessibility_notes' => $part['medical_or_accessibility_notes'] ?? null,
                'rate_snapshot' => $ratePerHead,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'amount_due' => $amountDue,
                'currency' => $package->currency,
                'payment_plan' => $paymentPlan,
                'payment_status' => 'unpaid',
                'status' => 'pending_payment',
                'bus_assignment_id' => $targetBusAssignment?->id,
                'seat_number' => $normalizedSeatLabel,
                'booked_at' => now(),
                'slot_expires_at' => null,
                'privacy_consent_at' => null,
                'created_by' => $actorId,
            ]);

            if (! $isManualSelection) {
                $this->busAllocator->allocate($booking);
            }

            // Create InvoicePassenger record so Accounting and traveler rosters immediately link this passenger
            InvoicePassenger::create([
                'invoice_id' => $invoice->id,
                'first_name' => $part['first_name'],
                'last_name' => $part['last_name'],
                'date_of_birth' => $part['date_of_birth'] ?? null,
                'emergency_contact' => $emergency['phone'] ?? ($guardian['phone'] ?? null),
                'special_needs' => $part['medical_or_accessibility_notes'] ?? null,
                'dietary_restrictions' => $part['dietary_restrictions'] ?? null,
            ]);

            $finalBusAssignment = $booking->fresh()->busAssignment;

            $slotTypeLabel = $participantType === 'adult' ? 'Adult / Companion slot' : 'Student / Child slot';

            $invoiceLine = [
                'service_id' => null,
                'item_name' => "{$package->name} - {$customerName}",
                'service_type' => 'educational_tour',
                'item_description' => "{$slotTypeLabel} for {$customerName} in {$package->name}.",
                'item_metadata' => [
                    'package_id' => $package->id,
                    'tour_code' => $package->tour_code,
                    'participant_type' => $participantType,
                    'student_number' => $studentNumber,
                    'booking_id' => $booking->id,
                    'booking_reference' => $booking->reference,
                    'bus_assignment_id' => $finalBusAssignment?->id,
                    'bus_id' => $finalBusAssignment?->bus_id,
                    'driver_id' => $finalBusAssignment?->driver_id,
                    'seat_number' => $booking->seat_number,
                    'pickup_location' => $package->pickup_location,
                    'destination' => $package->destination ?? $package->name,
                    'starts_at' => $package->starts_at?->toIso8601String(),
                    'ends_at' => $package->ends_at?->toIso8601String(),
                ],
                'quantity' => 1,
                'unit_price' => $subtotal,
                'total_price' => $subtotal,
            ];

            InvoiceItem::create(['invoice_id' => $invoice->id, ...$invoiceLine]);

            $invoice = $this->invoiceFinalization->finalizeWithinTransaction($invoice, [$invoiceLine]);

            return [
                'booking' => $booking->fresh(['invoice', 'busAssignment.bus', 'busAssignment.driver', 'package']),
                'package' => $package->fresh(['program', 'busAssignments.bus', 'busAssignments.driver']),
                'duplicate' => false,
            ];
        });

        if (! $result['duplicate'] && $result['booking']->invoice) {
            $this->invoiceFinalization->afterCommit($result['booking']->invoice, [
                'actor' => $actorId ? User::find($actorId) : null,
                'source' => 'educational_tour_desk_booking',
            ]);
            $this->tripTickets->synchronizeForEducationalTourPackage(
                $result['package']->fresh(['busAssignments.bus', 'busAssignments.driver', 'schoolCustomer'])
            );
        }

        return $this->formatRegistrationResponse($result['booking'], $result['duplicate']);
    }

    public function formatRegistrationResponse(
        EducationalTourParticipantBooking $booking,
        bool $duplicate = false
    ): array {
        return [
            'booking_reference' => $booking->reference,
            'public_id' => $booking->public_id,
            'duplicate' => $duplicate,
            'status' => $booking->status,
            'slot_expires_at' => $booking->slot_expires_at?->toIso8601String(),
            'bus_assignment_id' => $booking->bus_assignment_id,
            'seat_number' => $booking->seat_number,
            'participant' => [
                'display_name' => $booking->full_name,
                'first_name' => $booking->participant_first_name,
                'last_name' => $booking->participant_last_name,
                'participant_type' => $booking->participant_type ?? 'student',
                'student_number' => $booking->student_number,
                'grade_level' => $booking->grade_level,
                'section' => $booking->section,
            ],
            'billing' => [
                'invoice_id' => $booking->invoice_id,
                'invoice_number' => $booking->invoice?->invoice_number,
                'subtotal' => (float) $booking->subtotal,
                'tax_amount' => (float) $booking->tax_amount,
                'total' => (float) $booking->amount_due,
                'paid' => (float) ($booking->invoice?->amount_received ?? 0),
                'balance' => (float) ($booking->invoice?->balance ?? $booking->amount_due),
                'currency' => $booking->currency,
                'payment_plan' => $booking->payment_plan,
                'payment_status' => $booking->payment_status,
            ],
            'allocation' => [
                'status' => $booking->bus_assignment_id ? 'allocated' : 'pending',
                'bus_assignment_id' => $booking->bus_assignment_id,
                'bus_number' => $booking->busAssignment?->sequence_number,
                'bus_plate' => $booking->busAssignment?->bus?->plate_number,
                'seat_number' => $booking->seat_number,
            ],
        ];
    }

    public function bulkRegisterParticipants(
        EducationalTourPackage $package,
        array $participants,
        ?int $actorId = null
    ): array {
        $package->loadMissing(['busAssignments.bus']);
        $results = [];
        $errors = [];
        $createdCount = 0;
        $duplicateCount = 0;

        foreach ($participants as $index => $participantData) {
            try {
                // If sequence number was supplied instead of explicit bus assignment ID, resolve it
                if (! empty($participantData['bus_sequence']) && empty($participantData['bus_assignment_id'])) {
                    $assignment = $package->busAssignments->firstWhere('sequence_number', (int) $participantData['bus_sequence']);
                    if ($assignment) {
                        $participantData['bus_assignment_id'] = $assignment->id;
                    }
                }

                $res = $this->registerParticipantForPackage($package, $participantData, $actorId);
                if ($res['duplicate']) {
                    $duplicateCount++;
                } else {
                    $createdCount++;
                }
                $results[] = $res;
            } catch (\Exception $e) {
                $name = trim(($participantData['participant']['first_name'] ?? '').' '.($participantData['participant']['last_name'] ?? ''));
                $errors[] = [
                    'index' => $index + 1,
                    'participant' => $name ?: 'Row #'.($index + 1),
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'total' => count($participants),
            'created' => $createdCount,
            'duplicates' => $duplicateCount,
            'failed' => count($errors),
            'errors' => $errors,
            'data' => $results,
        ];
    }
}
