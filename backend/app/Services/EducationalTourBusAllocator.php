<?php

namespace App\Services;

use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EducationalTourBusAllocator
{
    public function __construct(private readonly TripTicketService $tripTickets) {}

    /**
     * Allocate the next available seat to a participant booking using fill-first strategy.
     */
    public function allocate(EducationalTourParticipantBooking $booking): bool
    {
        $allocated = DB::transaction(function () use ($booking) {
            $booking = EducationalTourParticipantBooking::lockForUpdate()->findOrFail($booking->id);

            if ($booking->bus_assignment_id && $booking->seat_number) {
                return true;
            }

            $package = EducationalTourPackage::findOrFail($booking->package_id);

            $busAssignments = EducationalTourBusAssignment::where('package_id', $package->id)
                ->whereIn('status', ['planned', 'reserved', 'confirmed'])
                ->orderBy('sequence_number', 'asc')
                ->lockForUpdate()
                ->get();

            foreach ($busAssignments as $assignment) {
                $occupiedCount = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->where('id', '!=', $booking->id)
                    ->count();

                if ($occupiedCount < $assignment->capacity_snapshot) {
                    $occupiedSeats = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                        ->whereNotIn('status', ['cancelled', 'expired'])
                        ->where('id', '!=', $booking->id)
                        ->pluck('seat_number')
                        ->filter()
                        ->all();

                    for ($seatNum = 1; $seatNum <= $assignment->capacity_snapshot; $seatNum++) {
                        $seatLabel = "Seat {$seatNum}";
                        if (! in_array($seatLabel, $occupiedSeats, true) && ! in_array((string) $seatNum, $occupiedSeats, true)) {
                            $booking->update([
                                'bus_assignment_id' => $assignment->id,
                                'seat_number' => $seatLabel,
                            ]);

                            return true;
                        }
                    }
                }
            }

            return false;
        });

        if ($allocated) {
            $this->synchronizePackage($booking->package_id);
        }

        return $allocated;
    }

    /**
     * Run batch allocation or rebalancing for a package.
     */
    public function allocatePackage(EducationalTourPackage $package, array $options = []): array
    {
        return DB::transaction(function () use ($package, $options) {
            $includeStatuses = $options['include_statuses'] ?? ['pending_payment', 'partially_paid', 'confirmed'];
            $rebalance = $options['rebalance_existing'] ?? false;

            if ($rebalance) {
                EducationalTourParticipantBooking::where('package_id', $package->id)
                    ->whereIn('status', $includeStatuses)
                    ->update(['bus_assignment_id' => null, 'seat_number' => null]);
            }

            $unallocatedBookings = EducationalTourParticipantBooking::where('package_id', $package->id)
                ->whereIn('status', $includeStatuses)
                ->whereNull('bus_assignment_id')
                ->orderBy('booked_at', 'asc')
                ->lockForUpdate()
                ->get();

            $allocatedCount = 0;
            foreach ($unallocatedBookings as $booking) {
                if ($this->allocate($booking)) {
                    $allocatedCount++;
                }
            }

            $busAssignments = EducationalTourBusAssignment::with('bus')
                ->where('package_id', $package->id)
                ->orderBy('sequence_number', 'asc')
                ->get();

            $busStats = $busAssignments->map(function (EducationalTourBusAssignment $assignment) {
                $occupied = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                    ->whereNotIn('status', ['cancelled', 'expired'])
                    ->count();

                return [
                    'id' => $assignment->id,
                    'sequence_number' => $assignment->sequence_number,
                    'bus_number' => $assignment->sequence_number,
                    'bus_id' => $assignment->bus_id,
                    'plate_number' => $assignment->bus?->plate_number,
                    'capacity' => $assignment->capacity_snapshot,
                    'occupied' => $occupied,
                    'available' => max(0, $assignment->capacity_snapshot - $occupied),
                ];
            });

            $alreadyAllocated = EducationalTourParticipantBooking::where('package_id', $package->id)
                ->whereIn('status', $includeStatuses)
                ->whereNotNull('bus_assignment_id')
                ->count();

            $waitingForBusCapacity = EducationalTourParticipantBooking::where('package_id', $package->id)
                ->whereIn('status', $includeStatuses)
                ->whereNull('bus_assignment_id')
                ->count();

            return [
                'package_id' => $package->id,
                'allocated' => $allocatedCount,
                'already_allocated' => $alreadyAllocated,
                'waiting_for_bus_capacity' => $waitingForBusCapacity,
                'buses' => $busStats,
            ];
        });
    }

    /**
     * Move a participant to a specific bus and seat.
     */
    public function moveParticipant(EducationalTourParticipantBooking $booking, int $targetBusAssignmentId, string $targetSeatNumber): void
    {
        DB::transaction(function () use ($booking, $targetBusAssignmentId, $targetSeatNumber) {
            $booking = EducationalTourParticipantBooking::lockForUpdate()->findOrFail($booking->id);
            $assignment = EducationalTourBusAssignment::lockForUpdate()->findOrFail($targetBusAssignmentId);

            if ($assignment->package_id !== $booking->package_id) {
                throw ValidationException::withMessages([
                    'bus_assignment_id' => 'Target bus assignment does not belong to this package.',
                ]);
            }

            $seatOccupied = EducationalTourParticipantBooking::where('bus_assignment_id', $assignment->id)
                ->where('seat_number', $targetSeatNumber)
                ->where('id', '!=', $booking->id)
                ->whereNotIn('status', ['cancelled', 'expired'])
                ->exists();

            if ($seatOccupied) {
                throw ValidationException::withMessages([
                    'seat_number' => "Seat {$targetSeatNumber} is already occupied on this bus.",
                ]);
            }

            $booking->update([
                'bus_assignment_id' => $assignment->id,
                'seat_number' => $targetSeatNumber,
            ]);
        });

        $this->synchronizePackage($booking->package_id);
    }

    /**
     * Release seat upon cancellation/expiration.
     */
    public function release(EducationalTourParticipantBooking $booking): void
    {
        $packageId = $booking->package_id;
        $booking->update([
            'bus_assignment_id' => null,
            'seat_number' => null,
        ]);
        $this->synchronizePackage($packageId);
    }

    private function synchronizePackage(int $packageId): void
    {
        $package = EducationalTourPackage::with(['busAssignments.bus', 'busAssignments.driver', 'schoolCustomer'])->find($packageId);
        if ($package) {
            $this->tripTickets->synchronizeForEducationalTourPackage($package);
        }
    }
}
