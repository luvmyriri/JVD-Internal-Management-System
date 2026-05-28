<?php

namespace App\Http\Controllers;

use App\Models\TripTicket;
use Illuminate\Http\Request;

class TripTicketController extends Controller
{
    public function index()
    {
        return TripTicket::with(['bus', 'driver', 'requestedBy', 'approvedBy'])->latest()->get();
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
            'status' => 'sometimes|in:draft,approved,completed',
            'passenger_rating' => 'sometimes|in:outstanding,satisfactory,needs_improvement,poor',
            'passenger_name' => 'sometimes|string',
            'fuel_consumed' => 'sometimes|numeric',
            'fuel_gauge_before' => 'sometimes|string',
            'fuel_gauge_after' => 'sometimes|string',
            'odometer_reading' => 'sometimes|numeric',
        ]);

        $ticket->update($validated);

        if ($request->has('status') && $request->status === 'approved') {
            $ticket->update(['approved_by' => auth()->id()]);
        }

        return $ticket->load(['bus', 'driver', 'requestedBy', 'approvedBy']);
    }

    public function destroy($id)
    {
        TripTicket::findOrFail($id)->delete();
        return response()->json(['message' => 'Trip ticket deleted successfully.']);
    }
}
