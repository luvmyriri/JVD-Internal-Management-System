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

        $tripTickets = \App\Models\TripTicket::with(['invoice.educationalTourParticipantBooking', 'invoice.joinerReservation', 'salesOrderItem.fulfillment'])
            ->where('bus_id', $bus->id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->whereBetween('date_of_travel', [$start->toDateString(), $end->toDateString()])
            ->get();

        // Whole-vehicle booking is active only if there is a private charter or non-shared trip ticket
        $isWholeVehicleBooked = $resourceAllocations->filter(function ($alloc) {
            return !in_array($alloc->source_type, [
                \App\Models\EducationalTourBusAssignment::class,
                'App\Models\EducationalTourBusAssignment',
                'educational_tour_bus_assignment',
                \App\Models\JoinerDeparture::class,
                'App\Models\JoinerDeparture',
                'joiner_departure',
            ]);
        })->isNotEmpty() || $tripTickets->filter(function ($ticket) use ($bus, $start, $end) {
            $isEdu = $ticket->invoice?->educationalTourParticipantBooking
                || ($ticket->salesOrderItem?->fulfillment instanceof \App\Models\EducationalTourParticipantBooking)
                || \App\Models\EducationalTourBusAssignment::where('bus_id', $bus->id)
                    ->whereHas('package', fn ($q) => $q->where('starts_at', '<', $end)->where('ends_at', '>', $start))
                    ->exists();
            $isJoiner = $ticket->invoice?->joinerReservation
                || ($ticket->salesOrderItem?->fulfillment instanceof \App\Models\JoinerReservation)
                || \App\Models\JoinerDeparture::where('bus_id', $bus->id)
                    ->where('starts_at', '<', $end)
                    ->where('ends_at', '>', $start)
                    ->exists();

            return ! $isEdu && ! $isJoiner;
        })->isNotEmpty();

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
                $code = preg_replace('/^(?:Seat|S)\s*/i', '', trim((string) $seat->seat_code));
                if ($code) $occupiedSeats[] = $code;
            }
        }

        $tripTicketInvoiceIds = $tripTickets->pluck('invoice_id')->filter()->unique();
        if ($tripTicketInvoiceIds->isNotEmpty()) {
            $passengers = \App\Models\InvoicePassenger::whereIn('invoice_id', $tripTicketInvoiceIds)->get();
            foreach ($passengers as $p) {
                $code = preg_replace('/^(?:Seat|S)\s*/i', '', trim((string) ($p->seat_code ?? $p->seat_number ?? '')));
                if ($code) $occupiedSeats[] = $code;
            }
        }

        $educationalBookings = \App\Models\EducationalTourParticipantBooking::whereHas('busAssignment', function ($q) use ($bus) {
            $q->where('bus_id', $bus->id);
        })
            ->whereNotIn('status', ['cancelled', 'expired'])
            ->whereHas('package', function ($q) use ($start, $end) {
                $q->where('starts_at', '<', $end)
                    ->where('ends_at', '>', $start);
            })
            ->get();

        foreach ($educationalBookings as $eb) {
            if ($eb->seat_number) {
                $code = preg_replace('/^(?:Seat|S)\s*/i', '', trim((string) $eb->seat_number));
                if ($code) $occupiedSeats[] = $code;
            }
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
