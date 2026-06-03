<?php

namespace App\Http\Controllers;

use App\Models\TripTicket;
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
        $validated = $request->validate([
            'control_no' => 'required|string|unique:trip_tickets,control_no',
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
        ]);

        $validated['requested_by'] = auth()->id();
        $validated['trip_type'] = $validated['trip_type'] ?? 'domestic';
        
        $ticket = TripTicket::create($validated);

        if ($ticket->bus_id) {
            $this->autoGeneratePreTripWorkOrder($ticket);
        }
        
        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest']);
    }

    public function show($id)
    {
        return TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy', 'workOrders.jobOrders', 'cashBudgetRequest'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $ticket = TripTicket::findOrFail($id);
        
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
        ]);

        $oldBusId = $ticket->bus_id;

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

        $ticket->update($validated);

        // If bus was newly assigned or changed, generate work order
        if ($ticket->bus_id && ($ticket->bus_id !== $oldBusId) && !$ticket->workOrders()->where('bus_id', $ticket->bus_id)->exists()) {
            $this->autoGeneratePreTripWorkOrder($ticket);
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
        TripTicket::findOrFail($id)->delete();
        return response()->json(['message' => 'Trip ticket deleted successfully.']);
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
