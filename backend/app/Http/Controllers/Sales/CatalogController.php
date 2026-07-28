<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Models\Service;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index()
    {
        return response()->json([
            'service_types' => collect(config('service_types'))->map(
                fn (array $type, string $code) => ['code' => $code, ...$type]
            )->values(),
            'legacy_categories' => ServiceCategory::all(),
            'services' => Service::where('is_active', true)->where('is_sales_catalog', true)->orderBy('name')->get([
                'id', 'name', 'description', 'category', 'service_type', 'price', 'adult_price', 'child_price', 'max_pax',
            ]),
            // Temporary alias for the unfinished legacy CheckoutWizard.
            'categories' => ServiceCategory::all(),
        ]);
    }

    public function busAvailability(Request $request)
    {
        $validated = $request->validate([
            'bus_id' => 'required|integer|exists:buses,id',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date',
        ]);

        $bus = \App\Models\Bus::with('driver')->findOrFail($validated['bus_id']);
        $start = \Carbon\Carbon::parse($validated['starts_at'])->startOfDay();
        $end = !empty($validated['ends_at']) ? \Carbon\Carbon::parse($validated['ends_at'])->endOfDay() : $start->copy()->endOfDay();

        $resourceAllocations = \App\Models\ResourceAllocation::where('bus_id', $bus->id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->where('starts_at', '<', $end)
            ->where('ends_at', '>', $start)
            ->get();

        $tripTickets = \App\Models\TripTicket::where('bus_id', $bus->id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->whereBetween('date_of_travel', [$start->toDateString(), $end->toDateString()])
            ->get();

        $isWholeVehicleBooked = $resourceAllocations->isNotEmpty() || $tripTickets->isNotEmpty();

        $occupiedSeats = [];

        $joinerDepartures = \App\Models\JoinerDeparture::with(['seats' => function($q) {
            $q->whereIn('status', ['held', 'confirmed']);
        }])
        ->where('bus_id', $bus->id)
        ->whereNotIn('status', ['cancelled', 'completed'])
        ->where('starts_at', '<', $end)
        ->where('ends_at', '>', $start)
        ->get();

        foreach ($joinerDepartures as $dep) {
            foreach ($dep->seats as $seat) {
                $code = preg_replace('/^S/i', '', trim($seat->seat_code));
                if ($code) $occupiedSeats[] = $code;
            }
        }

        $invoices = \App\Models\Invoice::with('items')
            ->where('bus_id', $bus->id)
            ->whereNotIn('status', ['void', 'cancelled'])
            ->where(function($q) use ($start, $end) {
                $q->whereBetween('travel_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('departure_date', [$start->toDateString(), $end->toDateString()]);
            })
            ->get();

        foreach ($invoices as $inv) {
            if ($inv->seat_map && is_array($inv->seat_map)) {
                foreach ($inv->seat_map as $s) {
                    $code = preg_replace('/^S/i', '', trim((string)$s));
                    if ($code) $occupiedSeats[] = $code;
                }
            }
            foreach ($inv->items as $item) {
                if (is_array($item->item_metadata)) {
                    $seats = $item->item_metadata['selected_seats'] ?? $item->item_metadata['seat_map'] ?? [];
                    if (is_array($seats)) {
                        foreach ($seats as $s) {
                            $code = preg_replace('/^S/i', '', trim((string)$s));
                            if ($code) $occupiedSeats[] = $code;
                        }
                    }
                }
            }
        }

        $passengers = \App\Models\InvoicePassenger::whereIn('invoice_id', $invoices->pluck('id'))->get();
        foreach ($passengers as $p) {
            $code = preg_replace('/^S/i', '', trim((string)($p->seat_code ?? $p->seat_number ?? '')));
            if ($code) $occupiedSeats[] = $code;
        }

        $occupiedSeats = array_values(array_unique($occupiedSeats));

        $driverId = $bus->assigned_driver;
        $isDriverAvailable = true;
        if ($driverId) {
            $driverAllocations = \App\Models\ResourceAllocation::where('driver_id', $driverId)
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->where('starts_at', '<', $end)
                ->where('ends_at', '>', $start)
                ->exists();
            $driverTrips = \App\Models\TripTicket::where('driver_id', $driverId)
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->whereBetween('date_of_travel', [$start->toDateString(), $end->toDateString()])
                ->exists();
            if ($driverAllocations || $driverTrips) {
                $isDriverAvailable = false;
            }
        }

        return response()->json([
            'data' => [
                'bus_id' => $bus->id,
                'plate_number' => $bus->plate_number,
                'model' => $bus->model,
                'seating_capacity' => $bus->seating_capacity,
                'custom_seats' => $bus->custom_seats,
                'is_whole_vehicle_booked' => $isWholeVehicleBooked,
                'occupied_seats' => $occupiedSeats,
                'driver' => $bus->driver ? [
                    'id' => $bus->driver->id,
                    'name' => $bus->driver->first_name . ' ' . $bus->driver->last_name,
                    'available' => $isDriverAvailable,
                ] : null,
            ],
        ]);
    }
}
