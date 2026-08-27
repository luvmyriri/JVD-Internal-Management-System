<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\EducationalTourProgram;
use App\Models\TripTicket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EducationalTourPackageService
{
    public function __construct(
        private readonly ResourceAllocationService $resourceAllocation,
        private readonly TripTicketService $tripTickets
    ) {}

    public function createPackage(array $data, int $actorId): array
    {
        return DB::transaction(function () use ($data, $actorId) {
            $program = null;
            if (! empty($data['program_id'])) {
                $program = EducationalTourProgram::findOrFail($data['program_id']);
            }

            $tourCode = $data['tour_code'] ?? null;
            if (! $tourCode) {
                $schoolPart = strtoupper(trim(substr(Str::slug($data['school_name'] ?? 'TOUR'), 0, 8), '-'));
                if (empty($schoolPart)) {
                    $schoolPart = 'TOUR';
                }
                $year = Carbon::parse($data['starts_at'])->format('Y');
                $seq = EducationalTourPackage::whereYear('starts_at', $year)->count() + 1;
                do {
                    $tourCode = sprintf('JVD-EDT-%s-%s-%03d', $schoolPart, $year, $seq);
                    $seq++;
                } while (EducationalTourPackage::where('tour_code', $tourCode)->exists());
            }

            $package = EducationalTourPackage::create([
                'public_id' => Str::uuid()->toString(),
                'tour_code' => $tourCode,
                'program_id' => $data['program_id'] ?? null,
                'school_customer_id' => $data['school_customer_id'] ?? null,
                'name' => $data['name'] ?? ($program ? $program->name : 'Educational Tour Package'),
                'school_name' => $data['school_name'] ?? ($program ? $program->name : 'School Group'),
                'grade_level' => $data['grade_level'] ?? null,
                'description' => $data['description'] ?? null,
                'learning_objectives' => $data['learning_objectives'] ?? ($program?->learning_objectives),
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'registration_opens_at' => $data['registration_opens_at'] ?? now(),
                'registration_closes_at' => $data['registration_closes_at'] ?? $data['starts_at'],
                'pickup_location' => $data['pickup_location'] ?? 'School Main Campus',
                'itinerary' => $data['itinerary'] ?? ($program?->default_stops ? array_map(fn ($s, $i) => ['day_number' => 1, 'sequence' => $i + 1, 'location' => $s, 'activity' => "Visit to {$s}"], $program->default_stops, array_keys($program->default_stops)) : []),
                'inclusions' => $data['inclusions'] ?? [
                    'Air-conditioned Tourist Bus',
                    'Destination & Museum Entrance Fees',
                    'Student Lunch & Snacks',
                    'Accident Insurance',
                    'Tour Coordinator',
                ],
                'exclusions' => $data['exclusions'] ?? ['Personal souvenirs'],
                'images' => $data['images'] ?? ($program?->images ?? []),
                'maximum_capacity' => (int) ($data['maximum_capacity'] ?? ($program?->minimum_students ?? 45)),
                'rate_per_head' => (float) ($data['rate_per_head'] ?? ($program?->student_price ?? 0)),
                'adult_rate_per_head' => ! empty($data['adult_rate_per_head']) ? (float) $data['adult_rate_per_head'] : (float) ($data['rate_per_head'] ?? ($program?->additional_chaperone_price ?? $program?->student_price ?? 0)),
                'currency' => $data['currency'] ?? 'PHP',
                'is_tax_inclusive' => false,
                'vat_rate' => 0,
                'payment_policy' => $data['payment_policy'] ?? 'flexible',
                'down_payment_amount' => ! empty($data['down_payment_amount']) ? (float) $data['down_payment_amount'] : null,
                'installment_count' => ! empty($data['installment_count']) ? (int) $data['installment_count'] : null,
                'balance_due_at' => $data['balance_due_at'] ?? $data['starts_at'],
                // Retained for the current schema only. Educational tours are desk-operated.
                'registration_token_hash' => hash('sha256', Str::random(64)),
                'status' => $data['status'] ?? 'draft',
                'operations_notes' => $data['operations_notes'] ?? null,
                'created_by' => $actorId,
                'published_at' => ($data['status'] ?? null) === 'published' ? now() : null,
            ]);

            if (! empty($data['bus_assignments']) && is_array($data['bus_assignments'])) {
                foreach ($data['bus_assignments'] as $idx => $busData) {
                    if (! empty($busData['bus_id'])) {
                        $this->assignBus($package, [
                            'bus_id' => (int) $busData['bus_id'],
                            'driver_id' => ! empty($busData['driver_id']) ? (int) $busData['driver_id'] : null,
                            'sequence_number' => $idx + 1,
                        ], $actorId);
                    }
                }
            }

            $freshPackage = $package->fresh(['program', 'schoolCustomer', 'busAssignments.bus', 'busAssignments.driver']);
            $this->tripTickets->synchronizeForEducationalTourPackage($freshPackage);

            return [
                'package' => $freshPackage,
            ];
        });
    }

    public function updatePackage(EducationalTourPackage $package, array $data): EducationalTourPackage
    {
        return DB::transaction(function () use ($package, $data) {
            $package = EducationalTourPackage::lockForUpdate()->findOrFail($package->id);

            if (isset($data['status']) && $data['status'] === 'published' && $package->status !== 'published') {
                $data['published_at'] = now();
            }

            unset($data['is_tax_inclusive'], $data['vat_rate']);
            $package->update([...$data, 'is_tax_inclusive' => false, 'vat_rate' => 0]);

            $freshPackage = $package->fresh(['program', 'schoolCustomer', 'busAssignments.bus', 'busAssignments.driver']);
            $this->tripTickets->synchronizeForEducationalTourPackage($freshPackage);

            return $freshPackage;
        });
    }

    public function publishPackage(EducationalTourPackage $package): array
    {
        return DB::transaction(function () use ($package) {
            $package = EducationalTourPackage::lockForUpdate()->findOrFail($package->id);

            $package->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            $freshPackage = $package->fresh(['program', 'schoolCustomer', 'busAssignments.bus', 'busAssignments.driver']);
            $this->tripTickets->synchronizeForEducationalTourPackage($freshPackage);

            return [
                'package' => $freshPackage,
            ];
        });
    }

    public function assignBus(EducationalTourPackage $package, array $data, int $actorId): EducationalTourBusAssignment
    {
        return DB::transaction(function () use ($package, $data, $actorId) {
            $package = EducationalTourPackage::lockForUpdate()->findOrFail($package->id);
            $bus = Bus::lockForUpdate()->findOrFail($data['bus_id']);
            $driver = ! empty($data['driver_id']) ? User::lockForUpdate()->findOrFail($data['driver_id']) : null;

            if ($bus->status !== 'available') {
                throw ValidationException::withMessages(['bus_id' => 'Vehicle is not in available status.']);
            }

            if ($driver && ($driver->role !== 'driver' || ! $driver->is_active)) {
                throw ValidationException::withMessages(['driver_id' => 'Driver must be an active driver.']);
            }

            $this->assertVehicleAvailable($bus->id, $driver?->id, $package->starts_at->toDateTimeString(), $package->ends_at->toDateTimeString(), $package->id);

            $sequence = $data['sequence_number'] ?? (EducationalTourBusAssignment::where('package_id', $package->id)->max('sequence_number') + 1);

            $assignment = EducationalTourBusAssignment::create([
                'package_id' => $package->id,
                'bus_id' => $bus->id,
                'driver_id' => $driver?->id,
                'sequence_number' => $sequence,
                'capacity_snapshot' => $bus->seating_capacity,
                'status' => 'reserved',
                'assigned_at' => now(),
                'created_by' => $actorId,
            ]);

            if ($driver) {
                $this->resourceAllocation->reserve(
                    $assignment,
                    $bus->id,
                    $driver->id,
                    $package->starts_at->toDateTimeString(),
                    $package->ends_at->toDateTimeString(),
                    "PKG-{$package->tour_code}-BUS-{$sequence}"
                );
            }

            $freshAssignment = $assignment->fresh(['bus', 'driver']);
            $this->tripTickets->synchronizeForEducationalTourPackage($package->fresh(['busAssignments.bus', 'busAssignments.driver', 'schoolCustomer']));

            return $freshAssignment;
        });
    }

    public function removeBusAssignment(EducationalTourBusAssignment $assignment): void
    {
        DB::transaction(function () use ($assignment) {
            $assignment = EducationalTourBusAssignment::lockForUpdate()->findOrFail($assignment->id);
            $packageId = $assignment->package_id;

            $hasActiveSeatedBookings = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                ->whereNotIn('status', ['cancelled', 'expired'])
                ->exists();

            if ($hasActiveSeatedBookings) {
                // Clear the seats so participants can be rebalanced
                EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->update(['bus_assignment_id' => null, 'seat_number' => null]);
            }

            $this->resourceAllocation->release($assignment);
            $assignment->delete();
            $this->tripTickets->synchronizeForEducationalTourPackage(
                EducationalTourPackage::with(['busAssignments.bus', 'busAssignments.driver', 'schoolCustomer'])->findOrFail($packageId)
            );
        });
    }

    /**
     * Delete an educational tour package and cascade related data.
     */
    public function deletePackage(EducationalTourPackage $package): void
    {
        DB::transaction(function () use ($package) {
            // Load relationships to ensure cascade deletions if needed
            $package->load(['busAssignments', 'participantBookings', 'program', 'schoolCustomer']);
            TripTicket::where('educational_tour_package_id', $package->id)
                ->where('status', '!=', 'completed')
                ->update(['status' => 'cancelled']);
            // Delete related participant bookings (will also delete payments via cascade)
            foreach ($package->participantBookings as $booking) {
                $booking->delete();
            }
            // Delete bus assignments
            foreach ($package->busAssignments as $assignment) {
                $this->resourceAllocation->release($assignment);
                $assignment->delete();
            }
            // Finally delete the package itself
            $package->delete();
        });
    }

    /**
     * Return package dashboard metrics for the API responses.
     * This is the primary shape consumed by the front‑end index / show / store / update / publish responses.
     */
    public function getDashboardMetrics(EducationalTourPackage $package): array
    {
        return $this->getPackageDetails($package);
    }

    /**
     * Get detailed package data for manifest and front‑end consumption.
     */
    public function getPackageDetails(EducationalTourPackage $package): array
    {
        $package->loadMissing(['busAssignments.bus', 'busAssignments.driver']);

        $participantBookings = EducationalTourParticipantBooking::where('package_id', $package->id)
            ->whereNotIn('status', ['cancelled', 'expired'])
            ->get();

        $reservedCount = $participantBookings->where('status', 'pending_payment')->count();
        $confirmedCount = $participantBookings->whereIn('status', ['partially_paid', 'confirmed', 'completed'])->count();
        $availableSlots = max(0, $package->maximum_capacity - ($reservedCount + $confirmedCount));

        $bookingCount = $participantBookings->count();
        $grossBilled = (float) $participantBookings->sum('amount_due');

        $bookingIds = $participantBookings->pluck('id')->all();
        $collected = (float) DB::table('educational_tour_booking_payments')
            ->whereIn('booking_id', $bookingIds)
            ->where('status', 'posted')
            ->sum('amount');

        $outstanding = max(0, $grossBilled - $collected);

        $plannedBusCapacity = (int) $package->busAssignments->whereIn('status', ['planned', 'reserved', 'confirmed'])->sum('capacity_snapshot');
        $allocatedParticipants = $participantBookings->whereNotNull('bus_assignment_id')->count();
        $waitingForAllocation = $participantBookings->whereNull('bus_assignment_id')->count();

        $studentsCount = $participantBookings->whereIn('participant_type', ['student', 'child', null])->count();
        $adultsCount = $participantBookings->whereIn('participant_type', ['adult', 'companion', 'guardian', 'teacher'])->count();

        return [
            'id' => $package->id,
            'public_id' => $package->public_id,
            'tour_code' => $package->tour_code,
            'name' => $package->name,
            'school_name' => $package->school_name,
            'grade_level' => $package->grade_level,
            'images' => $package->images ?? $package->program?->images ?? [],
            'status' => $package->status,
            'starts_at' => $package->starts_at?->toIso8601String(),
            'ends_at' => $package->ends_at?->toIso8601String(),
            'pricing' => [
                'rate_per_head' => (float) $package->rate_per_head,
                'adult_rate_per_head' => $package->adult_rate_per_head !== null ? (float) $package->adult_rate_per_head : (float) $package->rate_per_head,
                'currency' => $package->currency,
                'payment_policy' => $package->payment_policy,
                'down_payment_amount' => $package->down_payment_amount ? (float) $package->down_payment_amount : null,
                'installment_count' => $package->installment_count,
            ],
            'capacity' => [
                'maximum' => (int) $package->maximum_capacity,
                'reserved' => $reservedCount,
                'confirmed' => $confirmedCount,
                'available' => $availableSlots,
                'students_count' => $studentsCount,
                'adults_count' => $adultsCount,
            ],
            'sales' => [
                'booking_count' => $bookingCount,
                'gross_billed' => round($grossBilled, 2),
                'collected' => round($collected, 2),
                'outstanding' => round($outstanding, 2),
            ],
            'fleet' => [
                'planned_bus_capacity' => $plannedBusCapacity,
                'allocated_participants' => $allocatedParticipants,
                'waiting_for_allocation' => $waitingForAllocation,
                'assignments_count' => $package->busAssignments->count(),
            ],
            'bus_assignments' => $package->busAssignments->map(function ($assignment) {
                $occupied = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->count();

                return [
                    'id' => $assignment->id,
                    'sequence_number' => $assignment->sequence_number,
                    'bus_id' => $assignment->bus_id,
                    'bus_plate' => $assignment->bus?->plate_number,
                    'bus_model' => $assignment->bus?->model,
                    'driver_id' => $assignment->driver_id,
                    'driver_name' => $assignment->driver ? ($assignment->driver->first_name.' '.$assignment->driver->last_name) : null,
                    'capacity' => $assignment->capacity_snapshot,
                    'occupied' => $occupied,
                    'available' => max(0, $assignment->capacity_snapshot - $occupied),
                    'status' => $assignment->status,
                ];
            }),
        ];
    }

    private function assertVehicleAvailable(int $busId, ?int $driverId, string $startsAt, string $endsAt, ?int $currentPackageId = null): void
    {
        $startsAt = Carbon::parse($startsAt)->toDateTimeString();
        $endsAt = Carbon::parse($endsAt)->toDateTimeString();

        $packageAssignments = DB::table('educational_tour_bus_assignments as a')
            ->join('educational_tour_packages as p', 'p.id', '=', 'a.package_id')
            ->where('p.starts_at', '<', $endsAt)
            ->where('p.ends_at', '>', $startsAt)
            ->whereNotIn('p.status', ['cancelled', 'completed'])
            ->whereIn('a.status', ['planned', 'reserved', 'confirmed']);

        if ($currentPackageId) {
            $packageAssignments->where('p.id', '!=', $currentPackageId);
        }

        $busConflict = (clone $packageAssignments)->where('a.bus_id', $busId)->exists();
        if ($busConflict) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle is already assigned to another tour during this interval.']);
        }

        if ($driverId) {
            $driverConflict = (clone $packageAssignments)->where('a.driver_id', $driverId)->exists();
            if ($driverConflict) {
                throw ValidationException::withMessages(['driver_id' => 'Driver is already assigned to another tour during this interval.']);
            }
        }

        $central = $this->resourceAllocation->conflicts($startsAt, $endsAt);
        if (collect($central['bus_ids'] ?? [])->contains($busId)) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle is already reserved by central scheduling.']);
        }
        if ($driverId && collect($central['driver_ids'] ?? [])->contains($driverId)) {
            throw ValidationException::withMessages(['driver_id' => 'Driver is already reserved by central scheduling.']);
        }

        $startDate = Carbon::parse($startsAt)->toDateString();
        $endDate = Carbon::parse($endsAt)->toDateString();
        if (TripTicket::where('bus_id', $busId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle has an active trip ticket during these dates.']);
        }
        if ($driverId && TripTicket::where('driver_id', $driverId)->where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->exists()) {
            throw ValidationException::withMessages(['driver_id' => 'Driver has an active trip ticket during these dates.']);
        }
    }
}
