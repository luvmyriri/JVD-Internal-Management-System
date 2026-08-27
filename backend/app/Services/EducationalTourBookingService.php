<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\EducationalTourBooking;
use App\Models\EducationalTourProgram;
use App\Models\EducationalTourVehicle;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\PmsSchedule;
use App\Models\SalesOrderItem;
use App\Models\TripTicket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EducationalTourBookingService
{
    public function calculate(EducationalTourProgram $program, int $students, int $tourGuides): array
    {
        $students = max(0, $students);
        $tourGuides = max(0, $tourGuides);
        if ($students < $program->minimum_students) {
            throw ValidationException::withMessages(['student_count' => "This program requires at least {$program->minimum_students} students."]);
        }

        $chargeable = $tourGuides;
        $studentAmount = round($students * (float) $program->student_price, 2);
        $additionalPrice = (float) ($program->additional_chaperone_price ?? 0);
        $guideAmount = round($chargeable * $additionalPrice, 2);

        return [
            'student_count' => $students,
            'tour_guide_count' => $tourGuides,
            'chaperone_count' => $tourGuides,
            'required_tour_guides' => 0,
            'required_chaperones' => 0,
            'free_tour_guide_count' => 0,
            'free_chaperone_count' => 0,
            'chargeable_tour_guide_count' => $chargeable,
            'chargeable_chaperone_count' => $chargeable,
            'student_amount' => $studentAmount,
            'tour_guide_amount' => $guideAmount,
            'chaperone_amount' => $guideAmount,
            'complimentary_tour_guide_allowance' => 0,
            'subtotal' => round($studentAmount + $guideAmount, 2),
        ];
    }

    public function create(array $data, int $actorId): EducationalTourBooking
    {
        $booking = DB::transaction(function () use ($data, $actorId) {
            $program = EducationalTourProgram::where('is_active', true)->lockForUpdate()->findOrFail($data['program_id']);
            $guides = (int) ($data['tour_guide_count'] ?? $data['chaperone_count'] ?? 0);
            $pricing = $this->calculate($program, (int) $data['student_count'], $guides);
            $travelerCount = $data['student_count'] + $guides;
            if (collect($data['assignments'])->sum('planned_passengers') !== $travelerCount) {
                throw ValidationException::withMessages(['assignments' => 'Vehicle passenger allocations must equal the student and tour guide total.']);
            }

            $assignments = [];
            foreach ($data['assignments'] as $index => $assignment) {
                $bus = Bus::lockForUpdate()->findOrFail($assignment['bus_id']);
                $driver = User::lockForUpdate()->findOrFail($assignment['driver_id']);
                if ($bus->status !== 'available') {
                    throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is not in available status.']);
                }
                if ($assignment['planned_passengers'] > $bus->seating_capacity) {
                    throw ValidationException::withMessages(["assignments.$index.planned_passengers" => "Allocation exceeds this vehicle's {$bus->seating_capacity} seats."]);
                }
                if ($driver->role !== 'driver' || ! $driver->is_active) {
                    throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Select an active driver.']);
                }
                $this->assertAvailable($bus->id, $driver->id, $data['starts_at'], $data['ends_at'], $index);
                $assignments[] = [$bus, $driver, $assignment['planned_passengers']];
            }

            $tax = 0.0;
            $total = $pricing['subtotal'];
            $received = (float) $data['amount_received'];
            if ($data['payment_method'] === 'Cash' && $data['payment_type'] === 'full' && $received < $total) {
                throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the invoice total.']);
            }
            if ($data['payment_type'] === 'downpayment' && $received <= 0) {
                throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);
            }

            $finalizer = app(InvoiceFinalizationService::class);
            $customerId = $finalizer->resolveCustomerId($data['customer_id'] ?? null, $data['school_name'], $data['contact_email'] ?? null, $data['contact_number'] ?? null, null);
            $payment = $finalizer->computePaymentStatus($data['payment_method'], $data['payment_type'], $total, $received);
            $invoice = Invoice::create([
                'invoice_number' => SalesReferenceService::generate('INV', $data['pickup_location'] ?? null, now()), 'customer_id' => $customerId, 'customer_name' => $data['school_name'],
                'customer_email' => $data['contact_email'] ?? null, 'customer_contact' => $data['contact_number'] ?? null,
                'subtotal' => $pricing['subtotal'], 'tax_amount' => $tax, 'total_amount' => $total, 'amount_received' => $received,
                'change' => max(0, $received - $total), 'payment_method' => $data['payment_method'], 'payment_type' => $data['payment_type'],
                'balance' => $payment['balance'], 'due_date' => $data['due_date'] ?? Carbon::parse($data['starts_at'])->toDateString(),
                'status' => $payment['status'], 'created_by' => $actorId, 'notes' => 'Educational tour group booking.',
            ]);
            $studentLine = [
                'service_id' => $program->service_id,
                'item_name' => $program->name.' - Students',
                'service_type' => 'educational_tour',
                'item_description' => $program->learning_objectives ?: 'Student participation in the educational tour program.',
                'item_metadata' => ['program_id' => $program->id, 'participant_type' => 'student'],
                'quantity' => $data['student_count'],
                'unit_price' => $program->student_price,
                'total_price' => $pricing['student_amount'],
            ];
            InvoiceItem::create(['invoice_id' => $invoice->id, ...$studentLine]);

            $chaperoneLine = null;
            if ($pricing['chargeable_chaperone_count'] > 0) {
                $chaperoneLine = [
                    'service_id' => $program->service_id,
                    'item_name' => $program->name.' - Additional Tour Guides',
                    'service_type' => 'educational_tour',
                    'item_description' => 'Chargeable tour guides above the complimentary program allocation.',
                    'item_metadata' => ['program_id' => $program->id, 'participant_type' => 'tour_guide'],
                    'quantity' => $pricing['chargeable_chaperone_count'],
                    'unit_price' => $program->additional_chaperone_price,
                    'total_price' => $pricing['chaperone_amount'],
                ];
                InvoiceItem::create(['invoice_id' => $invoice->id, ...$chaperoneLine]);
            }
            $processedItems = [$studentLine];
            if ($chaperoneLine) {
                $processedItems[] = $chaperoneLine;
            }
            $invoice = $finalizer->finalizeWithinTransaction($invoice, $processedItems);

            $booking = EducationalTourBooking::create([
                'reference' => SalesReferenceService::generate('EDT', $program->name, $data['starts_at']), 'program_id' => $program->id, 'customer_id' => $customerId, 'invoice_id' => $invoice->id,
                'school_name' => $data['school_name'], 'contact_person' => $data['contact_person'], 'contact_email' => $data['contact_email'] ?? null,
                'contact_number' => $data['contact_number'] ?? null, 'grade_level' => $data['grade_level'], 'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'], 'pickup_location' => $data['pickup_location'], 'stops_snapshot' => ! empty($data['stops']) ? $data['stops'] : $program->default_stops,
                'student_count' => $data['student_count'], 'chaperone_count' => $data['chaperone_count'], 'free_chaperone_count' => $pricing['free_chaperone_count'],
                'booking_mode' => $data['booking_mode'] ?? 'entire_vehicle', 'selected_seats' => $data['selected_seats'] ?? [],
                'passengers' => $data['passengers'] ?? [],
                'chargeable_chaperone_count' => $pricing['chargeable_chaperone_count'], 'student_amount' => $pricing['student_amount'],
                'chaperone_amount' => $pricing['chaperone_amount'], 'subtotal' => $pricing['subtotal'],
                'pricing_snapshot' => [...$pricing, 'program' => $program->only(['id', 'name', 'student_price', 'additional_chaperone_price', 'students_per_chaperone', 'students_per_free_chaperone'])],
                'status' => 'confirmed', 'operations_notes' => $data['operations_notes'] ?? null, 'created_by' => $actorId,
            ]);
            foreach ($assignments as [$bus, $driver, $planned]) {
                EducationalTourVehicle::create(['booking_id' => $booking->id, 'bus_id' => $bus->id, 'driver_id' => $driver->id, 'capacity_snapshot' => $bus->seating_capacity, 'planned_passengers' => $planned]);
                app(ResourceAllocationService::class)->reserve($booking, $bus->id, $driver->id, $booking->starts_at, $booking->ends_at, $booking->reference);
            }

            return $booking->load(['program', 'vehicles.bus', 'vehicles.driver', 'invoice.items']);
        });

        app(InvoiceFinalizationService::class)->afterCommit($booking->invoice, [
            'actor' => User::find($actorId), 'source' => 'sales',
        ]);

        return $booking->fresh(['program', 'vehicles.bus', 'vehicles.driver', 'invoice.items']);
    }

    public function update(EducationalTourBooking $booking, array $data): EducationalTourBooking
    {
        $updated = DB::transaction(function () use ($booking, $data) {
            $booking = EducationalTourBooking::lockForUpdate()->findOrFail($booking->id);
            if (! in_array($booking->status, ['confirmed', 'awaiting_payment', 'in_progress'], true)) {
                throw ValidationException::withMessages(['booking' => 'Only active educational tour bookings can be edited.']);
            }

            $travelerCount = (int) $booking->student_count + (int) $booking->chaperone_count;
            if (collect($data['assignments'])->sum('planned_passengers') !== $travelerCount) {
                throw ValidationException::withMessages(['assignments' => 'Vehicle passenger allocations must equal the booked student and tour guide total.']);
            }
            if (($data['booking_mode'] ?? null) === 'selected_seats' && count($data['selected_seats'] ?? []) > $travelerCount) {
                throw ValidationException::withMessages(['selected_seats' => 'Selected seats cannot exceed the booked traveler count.']);
            }

            $validatedAssignments = [];
            foreach ($data['assignments'] as $index => $assignment) {
                $bus = Bus::lockForUpdate()->findOrFail($assignment['bus_id']);
                $driver = User::lockForUpdate()->findOrFail($assignment['driver_id']);
                if ($bus->status !== 'available') {
                    throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is not in available status.']);
                }
                if ((int) $assignment['planned_passengers'] > (int) $bus->seating_capacity) {
                    throw ValidationException::withMessages(["assignments.$index.planned_passengers" => "Allocation exceeds this vehicle's {$bus->seating_capacity} seats."]);
                }
                if ($driver->role !== 'driver' || ! $driver->is_active) {
                    throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Select an active driver.']);
                }
                $validatedAssignments[] = [$bus, $driver, (int) $assignment['planned_passengers']];
            }

            $allocation = app(ResourceAllocationService::class);
            $allocation->release($booking);
            foreach ($validatedAssignments as [$bus, $driver]) {
                $allocation->reserve($booking, $bus->id, $driver->id, $data['starts_at'], $data['ends_at'], $booking->reference);
            }

            $booking->vehicles()->delete();
            foreach ($validatedAssignments as [$bus, $driver, $planned]) {
                EducationalTourVehicle::create([
                    'booking_id' => $booking->id,
                    'bus_id' => $bus->id,
                    'driver_id' => $driver->id,
                    'capacity_snapshot' => $bus->seating_capacity,
                    'planned_passengers' => $planned,
                ]);
            }

            $booking->update([
                'school_name' => $data['school_name'],
                'contact_person' => $data['contact_person'],
                'contact_email' => $data['contact_email'] ?? null,
                'contact_number' => $data['contact_number'] ?? null,
                'grade_level' => $data['grade_level'],
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'pickup_location' => $data['pickup_location'],
                'stops_snapshot' => ! empty($data['stops']) ? $data['stops'] : $booking->program->default_stops,
                'booking_mode' => $data['booking_mode'],
                'selected_seats' => $data['selected_seats'] ?? [],
                'passengers' => $data['passengers'] ?? [],
                'operations_notes' => $data['operations_notes'] ?? null,
            ]);

            return $booking->fresh(['program.service', 'vehicles.bus', 'vehicles.driver', 'invoice.items']);
        });

        $orderItem = SalesOrderItem::where('fulfillment_type', $updated->getMorphClass())
            ->where('fulfillment_id', $updated->id)
            ->first();
        if ($orderItem) {
            app(TripTicketService::class)->synchronizeForSalesItem($orderItem, $updated->created_by);
        }

        return $updated->fresh(['program.service', 'vehicles.bus', 'vehicles.driver', 'invoice.items']);
    }

    public function createFromInvoice(Invoice $invoice, array $data, int $actorId): EducationalTourBooking
    {
        $program = EducationalTourProgram::where('is_active', true)->lockForUpdate()->findOrFail($data['program_id']);
        $guides = (int) ($data['tour_guide_count'] ?? $data['chaperone_count'] ?? 0);
        $pricing = $this->calculate($program, (int) $data['student_count'], $guides);
        $travelerCount = (int) $data['student_count'] + $guides;
        if (empty($data['assignments'])) {
            throw ValidationException::withMessages(['assignments' => 'Assign at least one vehicle.']);
        }
        if (collect($data['assignments'])->sum('planned_passengers') !== $travelerCount) {
            throw ValidationException::withMessages(['assignments' => 'Vehicle passenger allocations must equal the student and tour guide total.']);
        }

        $validatedAssignments = [];
        foreach ($data['assignments'] as $index => $assignment) {
            $bus = Bus::lockForUpdate()->findOrFail($assignment['bus_id']);
            $driver = User::lockForUpdate()->findOrFail($assignment['driver_id']);
            if ($bus->status !== 'available') {
                throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is not in available status.']);
            }
            if ((int) $assignment['planned_passengers'] > (int) $bus->seating_capacity) {
                throw ValidationException::withMessages(["assignments.$index.planned_passengers" => "Allocation exceeds this vehicle's {$bus->seating_capacity} seats."]);
            }
            if ($driver->role !== 'driver' || ! $driver->is_active) {
                throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Select an active driver.']);
            }
            $this->assertAvailable($bus->id, $driver->id, $data['starts_at'], $data['ends_at'], $index);
            $validatedAssignments[] = [$bus, $driver, (int) $assignment['planned_passengers']];
        }

        $booking = EducationalTourBooking::create([
            'reference' => SalesReferenceService::generate('EDT', $program->name, $data['starts_at']),
            'program_id' => $program->id, 'customer_id' => $invoice->customer_id, 'invoice_id' => $invoice->id,
            'school_name' => $data['school_name'], 'contact_person' => $data['contact_person'],
            'contact_email' => $data['contact_email'] ?? $invoice->customer_email, 'contact_number' => $data['contact_number'] ?? $invoice->customer_contact,
            'grade_level' => $data['grade_level'], 'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
            'pickup_location' => $data['pickup_location'], 'stops_snapshot' => ! empty($data['stops']) ? $data['stops'] : $program->default_stops,
            'student_count' => $data['student_count'], 'chaperone_count' => $guides,
            'booking_mode' => $data['booking_mode'] ?? 'entire_vehicle', 'selected_seats' => $data['selected_seats'] ?? [],
            'passengers' => $data['passengers'] ?? [], 'free_chaperone_count' => $pricing['free_chaperone_count'],
            'chargeable_chaperone_count' => $pricing['chargeable_chaperone_count'], 'student_amount' => $pricing['student_amount'],
            'chaperone_amount' => $pricing['chaperone_amount'], 'subtotal' => $invoice->subtotal,
            'pricing_snapshot' => [...$pricing, 'invoice_subtotal' => (float) $invoice->subtotal],
            'status' => 'confirmed', 'operations_notes' => $data['operations_notes'] ?? null, 'created_by' => $actorId,
        ]);
        foreach ($validatedAssignments as [$bus, $driver, $planned]) {
            EducationalTourVehicle::create(['booking_id' => $booking->id, 'bus_id' => $bus->id, 'driver_id' => $driver->id, 'capacity_snapshot' => $bus->seating_capacity, 'planned_passengers' => $planned]);
            app(ResourceAllocationService::class)->reserve($booking, $bus->id, $driver->id, $booking->starts_at, $booking->ends_at, $booking->reference);
        }

        return $booking;
    }

    private function assertAvailable(int $busId, int $driverId, string $startsAt, string $endsAt, int $index): void
    {
        $startsAt = Carbon::parse($startsAt)->toDateTimeString();
        $endsAt = Carbon::parse($endsAt)->toDateTimeString();
        $overlap = fn ($query) => $query->where('starts_at', '<', $endsAt)->where('ends_at', '>', $startsAt)->whereNotIn('status', ['cancelled', 'completed']);
        $educationBus = DB::table('educational_tour_vehicles as vehicle')
            ->join('educational_tour_bookings as booking', 'booking.id', '=', 'vehicle.booking_id')
            ->where('vehicle.bus_id', $busId)->where('booking.starts_at', '<', $endsAt)->where('booking.ends_at', '>', $startsAt)
            ->whereNotIn('booking.status', ['cancelled', 'completed'])->exists();
        $educationDriver = DB::table('educational_tour_vehicles as vehicle')
            ->join('educational_tour_bookings as booking', 'booking.id', '=', 'vehicle.booking_id')
            ->where('vehicle.driver_id', $driverId)->where('booking.starts_at', '<', $endsAt)->where('booking.ends_at', '>', $startsAt)
            ->whereNotIn('booking.status', ['cancelled', 'completed'])->exists();
        if ($educationBus || $overlap(CharterBooking::where('bus_id', $busId))->exists() || $overlap(JoinerDeparture::where('bus_id', $busId))->exists()) {
            throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is already reserved during this interval.']);
        }
        if ($educationDriver || $overlap(CharterBooking::where('driver_id', $driverId))->exists() || $overlap(JoinerDeparture::where('driver_id', $driverId))->exists()) {
            throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Driver is already assigned during this interval.']);
        }
        $startDate = Carbon::parse($startsAt)->toDateString();
        $endDate = Carbon::parse($endsAt)->toDateString();
        if (TripTicket::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists() || PmsSchedule::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle has a trip or maintenance conflict.']);
        }
        if (TripTicket::where('driver_id', $driverId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Driver has an existing trip ticket.']);
        }
    }
}
