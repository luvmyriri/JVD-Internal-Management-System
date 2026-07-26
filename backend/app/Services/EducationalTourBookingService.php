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
use App\Models\User;
use App\Services\SalesReferenceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EducationalTourBookingService
{
    public function calculate(EducationalTourProgram $program, int $students, int $chaperones): array
    {
        $students = max(0, $students);
        $chaperones = max(0, $chaperones);
        if ($students < $program->minimum_students) {
            throw ValidationException::withMessages(['student_count' => "This program requires at least {$program->minimum_students} students."]);
        }
        $perGuide = max(1, (int) ($program->students_per_chaperone ?: 20));
        $perFreeGuide = max(1, (int) ($program->students_per_free_chaperone ?: 20));
        $required = (int) ceil($students / $perGuide);
        if ($chaperones < $required) {
            throw ValidationException::withMessages([
                'tour_guide_count' => "At least {$required} tour guides are required for {$students} students.",
                'chaperone_count' => "At least {$required} tour guides are required for {$students} students.",
            ]);
        }
        $free = min($chaperones, (int) floor($students / $perFreeGuide));
        $chargeable = max(0, $chaperones - $free);
        $studentAmount = round($students * (float) $program->student_price, 2);
        $additionalPrice = (float) $program->additional_chaperone_price;
        $chaperoneAmount = round($chargeable * $additionalPrice, 2);
        $freeGuideAllowance = round($free * $additionalPrice, 2);

        return [
            'student_count' => $students,
            'tour_guide_count' => $chaperones,
            'chaperone_count' => $chaperones,
            'required_tour_guides' => $required,
            'required_chaperones' => $required,
            'free_tour_guide_count' => $free,
            'free_chaperone_count' => $free,
            'chargeable_tour_guide_count' => $chargeable,
            'chargeable_chaperone_count' => $chargeable,
            'student_amount' => $studentAmount,
            'tour_guide_amount' => $chaperoneAmount,
            'chaperone_amount' => $chaperoneAmount,
            'complimentary_tour_guide_allowance' => $freeGuideAllowance,
            'subtotal' => round($studentAmount + $chaperoneAmount, 2),
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
                if ($bus->status !== 'available') throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is not in available status.']);
                if ($assignment['planned_passengers'] > $bus->seating_capacity) throw ValidationException::withMessages(["assignments.$index.planned_passengers" => "Allocation exceeds this vehicle's {$bus->seating_capacity} seats."]);
                if ($driver->role !== 'driver' || !$driver->is_active) throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Select an active driver.']);
                $this->assertAvailable($bus->id, $driver->id, $data['starts_at'], $data['ends_at'], $index);
                $assignments[] = [$bus, $driver, $assignment['planned_passengers']];
            }

            $taxRate = (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
            $tax = round($pricing['subtotal'] * $taxRate, 2);
            $total = round($pricing['subtotal'] + $tax, 2);
            $received = (float) $data['amount_received'];
            if ($data['payment_method'] === 'Cash' && $data['payment_type'] === 'full' && $received < $total) throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the invoice total.']);
            if ($data['payment_type'] === 'downpayment' && $received <= 0) throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);

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
                'ends_at' => $data['ends_at'], 'pickup_location' => $data['pickup_location'], 'stops_snapshot' => $data['stops'] ?? $program->default_stops,
                'student_count' => $data['student_count'], 'chaperone_count' => $data['chaperone_count'], 'free_chaperone_count' => $pricing['free_chaperone_count'],
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
        if ($educationBus || $overlap(CharterBooking::where('bus_id', $busId))->exists() || $overlap(JoinerDeparture::where('bus_id', $busId))->exists()) throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle is already reserved during this interval.']);
        if ($educationDriver || $overlap(CharterBooking::where('driver_id', $driverId))->exists() || $overlap(JoinerDeparture::where('driver_id', $driverId))->exists()) throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Driver is already assigned during this interval.']);
        $startDate = Carbon::parse($startsAt)->toDateString(); $endDate = Carbon::parse($endsAt)->toDateString();
        if (\App\Models\TripTicket::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists() || \App\Models\PmsSchedule::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->exists()) throw ValidationException::withMessages(["assignments.$index.bus_id" => 'Vehicle has a trip or maintenance conflict.']);
        if (\App\Models\TripTicket::where('driver_id', $driverId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) throw ValidationException::withMessages(["assignments.$index.driver_id" => 'Driver has an existing trip ticket.']);
    }
}
