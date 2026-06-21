<?php

namespace App\Http\Controllers;

use App\Models\TripTicket;
use App\Models\Bus;
use Illuminate\Http\Request;

class TripTicketController extends Controller
{
    public function index()
    {
        $query = TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest']);

        if (auth()->user()->role === 'driver') {
            $query->where('driver_id', auth()->id());
        }

        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if ($user && $user->role === 'driver') {
            return response()->json(['success' => false, 'message' => 'Drivers are not authorized to create trip tickets.'], 403);
        }

        $validated = $request->validate([
            'control_no' => 'nullable|string|unique:trip_tickets,control_no',
            'issue_date' => 'required|date',
            'date_of_travel' => 'required|date',
            'duration' => 'nullable|string',
            'pick_up' => 'required|string',
            'drop_off' => 'required|string',
            'bus_id' => 'nullable|exists:buses,id',
            'plate_no' => 'nullable|string',
            'no_of_passengers' => 'required|integer',
            'driver_id' => 'nullable|exists:users,id',
            
            'meal_allowance' => 'nullable|numeric',
            'diesel' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'easy_trip' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',
            
            'fuel_consumed' => 'nullable|numeric',
            'fuel_gauge_before' => 'nullable|string',
            'fuel_gauge_after' => 'nullable|string',
            'odometer_reading' => 'nullable|numeric',
            
            'passenger_rating' => 'nullable|in:outstanding,satisfactory,needs_improvement,poor',
            'passenger_name' => 'nullable|string',
            'trip_type' => 'nullable|in:domestic,international',
            'override_conflict' => 'nullable|boolean',
        ]);

        // ── Conflict Check: Prevent double-booking driver or bus on overlapping date ranges ──
        $override = filter_var($request->input('override_conflict'), FILTER_VALIDATE_BOOLEAN);
        $canOverride = $user && (
            $user->hasRole('super_admin', 'executive_vice_president', 'operations_manager') ||
            $user->hasTag('process:override_schedule')
        );

        if (!$override || !$canOverride) {
            $conflictResponse = $this->detectScheduleConflict(
                $validated['driver_id'] ?? null,
                $validated['bus_id'] ?? null,
                $validated['date_of_travel'],
                $validated['duration'] ?? null
            );
            if ($conflictResponse) {
                return $conflictResponse;
            }
        }

        $validated['requested_by'] = auth()->id();
        $validated['trip_type'] = $validated['trip_type'] ?? 'domestic';

        $ticket = \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
            if (empty($validated['control_no'])) {
                // Lock the latest row so concurrent requests serialize and cannot read the same
                // sequence number (mirrors PurchaseOrderService::generatePONumber()).
                $year = now()->year;
                $latest = TripTicket::where('control_no', 'like', "DTT-{$year}-%")
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();
                $sequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->control_no);
                    $sequence = (int) end($parts) + 1;
                }
                $validated['control_no'] = sprintf('DTT-%d-%04d', $year, $sequence);
            }

            return TripTicket::create(array_diff_key($validated, ['override_conflict' => '']));
        });

        if ($ticket->bus_id) {
            $this->autoGeneratePreTripWorkOrder($ticket);
        }
        
        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest']);
    }

    public function show($id)
    {
        $ticket = TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest'])->findOrFail($id);

        $user = auth()->user();
        if ($user && $user->role === 'driver') {
            if ($ticket->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access to this trip ticket.'], 403);
            }
        }

        return $ticket;
    }

    public function update(Request $request, $id)
    {
        $ticket = TripTicket::findOrFail($id);
        $user = auth()->user();

        // 1. Enforce ownership and role checks
        if ($user && $user->role === 'driver') {
            if ($ticket->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access to this trip ticket.'], 403);
            }

            // Drivers can only update travel completion fields
            $allowedFields = [
                'passenger_rating', 'passenger_name', 
                'fuel_consumed', 'fuel_gauge_before', 'fuel_gauge_after', 'odometer_reading',
                'status'
            ];
            
            // Reject if request has other fields
            $extra = array_diff(array_keys($request->except(['_method'])), $allowedFields);
            if (!empty($extra)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized field updates: Drivers are only allowed to submit completion reports.'
                ], 403);
            }

            // Drivers cannot approve a ticket
            if ($request->has('status') && $request->input('status') === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Drivers cannot approve trip tickets.'
                ], 403);
            }

            // D-01: Drivers may only submit their completion report (approved -> completed).
            // They must not be able to revert to draft or mark non-approved trips as completed.
            if ($request->has('status')) {
                $requestedStatus = $request->input('status');
                if ($requestedStatus !== 'completed') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Drivers can only mark an approved trip as completed.'
                    ], 403);
                }
                if ($ticket->status !== 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only an approved trip can be marked as completed.'
                    ], 422);
                }
            }
        }

        // 2. Enforce C-04: Block updates to allowance fields if CashBudgetRequest has been submitted/approved/disbursed
        $financialFields = ['meal_allowance', 'diesel', 'sop', 'easy_trip', 'autosweep'];
        $hasFinancialUpdates = false;
        foreach ($financialFields as $field) {
            if ($request->has($field)) {
                $hasFinancialUpdates = true;
                break;
            }
        }

        if ($hasFinancialUpdates) {
            $budget = \App\Models\CashBudgetRequest::where('trip_ticket_id', $ticket->id)->first();
            if ($budget && $budget->status !== 'draft') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot modify allowances: The associated Cash Budget Request is already in status "' . $budget->status . '" and cannot be updated.'
                ], 422);
            }
        }

        $validated = $request->validate([
            'control_no' => 'sometimes|string|unique:trip_tickets,control_no,' . $id,
            'issue_date' => 'sometimes|date',
            'date_of_travel' => 'sometimes|date',
            'duration' => 'nullable|string',
            'pick_up' => 'sometimes|string',
            'drop_off' => 'sometimes|string',
            'bus_id' => 'nullable|exists:buses,id',
            'plate_no' => 'nullable|string',
            'no_of_passengers' => 'sometimes|integer',
            'driver_id' => 'nullable|exists:users,id',
            
            'meal_allowance' => 'nullable|numeric',
            'diesel' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'easy_trip' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',
            
            'status' => 'sometimes|in:draft,approved,completed',
            'passenger_rating' => 'nullable|in:outstanding,satisfactory,needs_improvement,poor',
            'passenger_name' => 'nullable|string',
            'fuel_consumed' => 'nullable|numeric',
            'fuel_gauge_before' => 'nullable|string',
            'fuel_gauge_after' => 'nullable|string',
            'odometer_reading' => 'nullable|numeric',
            'trip_type' => 'sometimes|in:domestic,international',
            'override_conflict' => 'nullable|boolean',
        ]);

        if ($user && $user->role === 'driver') {
            // Keep only allowed driver fields in $validated
            $validated = array_intersect_key($validated, array_flip([
                'passenger_rating', 'passenger_name', 
                'fuel_consumed', 'fuel_gauge_before', 'fuel_gauge_after', 'odometer_reading',
                'status'
            ]));
        }

        $oldBusId = $ticket->bus_id;
        $oldDriverId = $ticket->driver_id;

        // ── Conflict Check on update: when driver, bus, date, or duration changes ──
        $newDriverId = $validated['driver_id'] ?? $ticket->driver_id;
        $newBusId = $validated['bus_id'] ?? $ticket->bus_id;
        $newDate = $validated['date_of_travel'] ?? $ticket->date_of_travel;
        $newDuration = array_key_exists('duration', $validated) ? $validated['duration'] : $ticket->duration;

        $driverChanged = isset($validated['driver_id']) && $validated['driver_id'] != $ticket->driver_id;
        $busChanged = isset($validated['bus_id']) && $validated['bus_id'] != $ticket->bus_id;
        $dateChanged = isset($validated['date_of_travel']) && $validated['date_of_travel'] != $ticket->date_of_travel;
        $durationChanged = array_key_exists('duration', $validated) && $validated['duration'] != $ticket->duration;

        if ($driverChanged || $busChanged || $dateChanged || $durationChanged) {
            $override = filter_var($request->input('override_conflict'), FILTER_VALIDATE_BOOLEAN);
            $canOverride = $user && (
                $user->hasRole('super_admin', 'executive_vice_president', 'operations_manager') ||
                $user->hasTag('process:override_schedule')
            );

            if (!$override || !$canOverride) {
                $conflictResponse = $this->detectScheduleConflict(
                    $newDriverId,
                    $newBusId,
                    $newDate,
                    $newDuration,
                    $ticket->id
                );
                if ($conflictResponse) {
                    return $conflictResponse;
                }
            }
        }

        $isSuperAdmin = auth()->user() && auth()->user()->hasRole('super_admin');

        if ($request->has('status') && $request->status === 'approved' && !$isSuperAdmin) {
            // Strict Process Guard:
            if (!$ticket->bus_id && !isset($validated['bus_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve Trip Ticket: A vehicle (bus) must be assigned first.'
                ], 422);
            }

            $currentBusId = $validated['bus_id'] ?? $ticket->bus_id;

            // Retrieve the pre-trip work order for this bus and trip ticket
            $wo = \App\Models\WorkOrder::where('trip_ticket_id', $ticket->id)
                ->where('bus_id', $currentBusId)
                ->first();

            if (!$wo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve Trip Ticket: Pre-trip safety inspection Work Order does not exist for the assigned vehicle.'
                ], 422);
            }

            if ($wo->status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve Trip Ticket: Associated Pre-trip safety Work Order (' . $wo->wo_number . ') must be fully completed.'
                ], 422);
            }

            // Check if there is an associated Job Order and if it is completed
            $hasJobOrder = \App\Models\JobOrder::where('work_order_id', $wo->id)->exists();
            if (!$hasJobOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve Trip Ticket: A Job Order must be generated and completed for Pre-trip safety Work Order (' . $wo->wo_number . ').'
                ], 422);
            }

            $incompleteJo = \App\Models\JobOrder::where('work_order_id', $wo->id)
                ->where('status', '!=', 'completed')
                ->first();

            if ($incompleteJo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve Trip Ticket: The associated Job Order (' . $incompleteJo->jo_number . ') is still incomplete.'
                ], 422);
            }
        }

        $ticket->update(array_diff_key($validated, ['override_conflict' => '']));

        // If bus was newly assigned or changed, generate work order
        if ($ticket->bus_id && ($ticket->bus_id !== $oldBusId) && !$ticket->workOrders()->where('bus_id', $ticket->bus_id)->exists()) {
            $this->autoGeneratePreTripWorkOrder($ticket);
        }

        // H-03: Sync driver update on trip ticket to the pre-trip safety Work Order
        if ($ticket->driver_id && ($ticket->driver_id !== $oldDriverId)) {
            \App\Models\WorkOrder::where('trip_ticket_id', $ticket->id)
                ->where('bus_id', $ticket->bus_id)
                ->update(['assigned_to' => $ticket->driver_id]);
        }

        if ($request->has('status') && $request->status === 'approved') {
            $ticket->update(['approved_by' => auth()->id()]);

            // Sync/Create Cash Budget Request for the Trip Ticket
            $budgetData = [
                'travel_date' => $ticket->date_of_travel,
                'plate_number' => $ticket->bus?->plate_number ?? $ticket->plate_no ?? 'TBA',
                'destination' => $ticket->drop_off,
                'diesel' => $ticket->diesel ?? 0,
                'meal_allowance' => $ticket->meal_allowance ?? 0,
                'sop' => $ticket->sop ?? 0,
                'autosweep' => $ticket->autosweep ?? 0,
                'easytrip' => $ticket->easy_trip ?? 0,
                'total_amount' => ($ticket->diesel ?? 0) + ($ticket->meal_allowance ?? 0) + ($ticket->sop ?? 0) + ($ticket->autosweep ?? 0) + ($ticket->easy_trip ?? 0),
            ];

            $budget = \App\Models\CashBudgetRequest::where('trip_ticket_id', $ticket->id)->first();
            if ($budget) {
                $budget->update($budgetData);
            } else {
                $budget = \App\Models\CashBudgetRequest::create(array_merge($budgetData, [
                    'date' => now(),
                    'status' => 'draft',
                    'prepared_by' => auth()->id() ?? $ticket->requested_by ?? 1,
                    'trip_ticket_id' => $ticket->id,
                ]));
            }

            // Notify Accounting!
            \App\Http\Services\NotificationService::notifyCashBudgetSpawn($budget);
        }

        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest']);
    }

    public function destroy($id)
    {
        $ticket = TripTicket::findOrFail($id);
        $user = auth()->user();
        
        if ($user && $user->role === 'driver') {
            return response()->json(['success' => false, 'message' => 'Drivers are not authorized to delete trip tickets.'], 403);
        }

        $ticket->delete();
        return response()->json(['message' => 'Trip ticket deleted successfully.']);
    }

    private function getTripDateRange($dateOfTravel, $duration)
    {
        $startDate = \Carbon\Carbon::parse($dateOfTravel)->startOfDay();
        
        $days = 1;
        if ($duration && preg_match('/(\d+)\s*day/i', $duration, $matches)) {
            $days = (int) $matches[1];
        }
        
        if ($days < 1) {
            $days = 1;
        }
        
        $endDate = $startDate->copy()->addDays($days - 1)->endOfDay();
        
        return [$startDate, $endDate];
    }

    /**
     * Proactive conflict-check endpoint for frontend use.
     * GET /api/trip-tickets/check-conflict?driver_id=&bus_id=&date_of_travel=&duration=&exclude_id=
     */
    public function checkConflict(Request $request)
    {
        $request->validate([
            'date_of_travel' => 'required|date',
            'duration' => 'nullable|string',
            'driver_id' => 'nullable|integer',
            'bus_id' => 'nullable|integer',
            'exclude_id' => 'nullable|integer',
        ]);

        $driverId = $request->query('driver_id');
        $busId = $request->query('bus_id');
        $dateOfTravel = $request->query('date_of_travel');
        $duration = $request->query('duration');
        $excludeId = $request->query('exclude_id');

        $conflicts = [];

        list($reqStart, $reqEnd) = $this->getTripDateRange($dateOfTravel, $duration);

        if ($driverId) {
            $driverTrips = TripTicket::where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->with('driver:id,first_name,last_name')
                ->get();

            foreach ($driverTrips as $trip) {
                list($start, $end) = $this->getTripDateRange($trip->date_of_travel, $trip->duration);
                if ($reqStart->lte($end) && $reqEnd->gte($start)) {
                    $conflicts[] = [
                        'type' => 'driver',
                        'message' => 'Driver is already assigned to trip ' . $trip->control_no
                            . ' (' . $trip->pick_up . ' → ' . $trip->drop_off . ') on ' . $trip->date_of_travel . ' (Duration: ' . ($trip->duration ?: '1 day') . ')',
                        'conflicting_ticket' => [
                            'id' => $trip->id,
                            'control_no' => $trip->control_no,
                            'pick_up' => $trip->pick_up,
                            'drop_off' => $trip->drop_off,
                            'date_of_travel' => $trip->date_of_travel,
                        ]
                    ];
                    break;
                }
            }
        }

        if ($busId) {
            $busTrips = TripTicket::where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->with('bus:id,plate_number,model')
                ->get();

            foreach ($busTrips as $trip) {
                list($start, $end) = $this->getTripDateRange($trip->date_of_travel, $trip->duration);
                if ($reqStart->lte($end) && $reqEnd->gte($start)) {
                    $conflicts[] = [
                        'type' => 'bus',
                        'message' => 'Vehicle is already assigned to trip ' . $trip->control_no
                            . ' (' . $trip->pick_up . ' → ' . $trip->drop_off . ') on ' . $trip->date_of_travel . ' (Duration: ' . ($trip->duration ?: '1 day') . ')',
                        'conflicting_ticket' => [
                            'id' => $trip->id,
                            'control_no' => $trip->control_no,
                            'pick_up' => $trip->pick_up,
                            'drop_off' => $trip->drop_off,
                            'date_of_travel' => $trip->date_of_travel,
                        ]
                    ];
                    break;
                }
            }
        }

        return response()->json([
            'has_conflict' => count($conflicts) > 0,
            'conflicts' => $conflicts
        ]);
    }

    /**
     * Detect scheduling conflicts for a driver or bus on a given date range.
     * Returns a JSON error response if conflict found, or null if clear.
     */
    private function detectScheduleConflict($driverId, $busId, $dateOfTravel, $duration = null, $excludeTicketId = null)
    {
        list($reqStart, $reqEnd) = $this->getTripDateRange($dateOfTravel, $duration);

        if ($driverId) {
            $driverTrips = TripTicket::where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTicketId, fn($q) => $q->where('id', '!=', $excludeTicketId))
                ->get();

            foreach ($driverTrips as $trip) {
                list($start, $end) = $this->getTripDateRange($trip->date_of_travel, $trip->duration);
                if ($reqStart->lte($end) && $reqEnd->gte($start)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Schedule conflict: The selected driver is already assigned to trip '
                            . $trip->control_no . ' (' . $trip->pick_up . ' → '
                            . $trip->drop_off . ') on ' . $trip->date_of_travel . ' (Duration: ' . ($trip->duration ?: '1 day') . ').'
                    ], 422);
                }
            }
        }

        if ($busId) {
            $busTrips = TripTicket::where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTicketId, fn($q) => $q->where('id', '!=', $excludeTicketId))
                ->get();

            foreach ($busTrips as $trip) {
                list($start, $end) = $this->getTripDateRange($trip->date_of_travel, $trip->duration);
                if ($reqStart->lte($end) && $reqEnd->gte($start)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Schedule conflict: The selected vehicle is already assigned to trip '
                            . $trip->control_no . ' (' . $trip->pick_up . ' → '
                            . $trip->drop_off . ') on ' . $trip->date_of_travel . ' (Duration: ' . ($trip->duration ?: '1 day') . ').'
                    ], 422);
                }
            }
        }

        return null; // No conflict
    }

    public function autoGeneratePreTripWorkOrder(TripTicket $ticket)
    {
        $year = now()->year;
        $latest = \App\Models\WorkOrder::where('wo_number', 'like', "WO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->wo_number);
            $sequence = (int) end($parts) + 1;
        }
        $woNumber = sprintf('WO-%d-%04d', $year, $sequence);

        $wo = \App\Models\WorkOrder::create([
            'wo_number'     => $woNumber,
            'bus_id'        => $ticket->bus_id,
            'assigned_to'   => $ticket->driver_id,
            'created_by'    => auth()->id() ?? $ticket->requested_by ?? 1,
            'status'        => 'pending_approval',
            'priority'      => 'urgent',
            'description'   => 'Auto-generated Pre-trip Safety Inspection for Trip Ticket #' . $ticket->control_no . '. Inspect brakes, tires, fluids, and steering.',
            'auto_generated'=> true,
            'trip_ticket_id'=> $ticket->id,
        ]);

        \App\Http\Services\NotificationService::notifyWorkOrderRequest($wo);
    }
}
