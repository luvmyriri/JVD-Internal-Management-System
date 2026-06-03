<?php

namespace App\Http\Controllers;

use App\Models\TripTicket;
use Illuminate\Http\Request;

class TripTicketController extends Controller
{
    public function index()
    {
        $query = TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy']);

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
        
        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy']);
    }

    public function show($id)
    {
        return TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy'])->findOrFail($id);
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

        $ticket->update($validated);

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
                \App\Models\CashBudgetRequest::create(array_merge($budgetData, [
                    'date' => now(),
                    'status' => 'draft',
                    'prepared_by' => auth()->id() ?? $ticket->requested_by ?? 1,
                    'trip_ticket_id' => $ticket->id,
                ]));
            }
        }

        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy']);
    }

    public function destroy($id)
    {
        TripTicket::findOrFail($id)->delete();
        return response()->json(['message' => 'Trip ticket deleted successfully.']);
    }
}
