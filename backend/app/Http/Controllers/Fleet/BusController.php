<?php

namespace App\Http\Controllers\Fleet;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBusRequest;
use App\Http\Resources\BusResource;
use App\Models\Bus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Services\AuditLogService;

class BusController extends Controller
{
    /**
     * List all buses — filterable by status, searchable by plate/model.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Bus::with('driver');

        $user = $request->user();
        if ($user->hasRole('driver')) {
            $query->where('assigned_driver', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('plate_number', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('model', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%");
            });
        }

        // Surface overdue buses first
        if ($request->boolean('overdue')) {
            $query->whereNotNull('next_service_due')
                  ->where('next_service_due', '<', now()->toDateString());
        }

        $buses = $query->orderBy('plate_number')
                       ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => BusResource::collection($buses)->resolve(),
            'meta'    => [
                'current_page' => $buses->currentPage(),
                'last_page'    => $buses->lastPage(),
                'per_page'     => $buses->perPage(),
                'total'        => $buses->total(),
            ],
        ]);
    }

    /**
     * Add a new bus to the fleet.
     */
    public function store(StoreBusRequest $request): JsonResponse
    {
        $bus = Bus::create($request->validated());

        return response()->json([
            'success' => true,
            'data'    => new BusResource($bus->load('driver')),
            'message' => 'Bus added to the fleet successfully.',
        ], 201);
    }

    /**
     * Get a single bus with its driver and work order history.
     */
    public function show(Request $request, Bus $bus): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver') && $bus->assigned_driver !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => new BusResource($bus->load(['driver', 'workOrders'])),
        ]);
    }

    /**
     * Update bus details (status, mileage, driver assignment, service dates).
     */
    public function update(Request $request, Bus $bus): JsonResponse
    {
        $validated = $request->validate([
            'model'             => ['sometimes', 'string', 'max:150'],
            'bus_category'      => ['sometimes', 'in:LUXURY,VIP,ECONOMY'],
            'seating_capacity'  => ['sometimes', 'integer', 'min:1', 'max:120'],
            'status'            => ['sometimes', 'in:available,in_service,under_maintenance,decommissioned'],
            'total_mileage'     => ['sometimes', 'numeric', 'min:0'],
            'last_service_date' => ['nullable', 'date'],
            'next_service_due'  => ['nullable', 'date'],
            'assigned_driver'   => ['nullable', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
            'plate_number'      => ['sometimes', 'string', 'max:20', 'unique:buses,plate_number,' . $bus->id],
        ]);

        $oldValues = $bus->getOriginal();
        
        // Ensure atomic driver assignment: a driver can only be assigned to one bus at a time
        if (array_key_exists('assigned_driver', $validated) && $validated['assigned_driver'] !== null) {
            Bus::where('assigned_driver', $validated['assigned_driver'])
               ->where('id', '!=', $bus->id)
               ->update(['assigned_driver' => null]);
        }

        $bus->update($validated);

        AuditLogService::log(
            action: 'UPDATE_BUS',
            module: 'fleet',
            entityType: 'bus',
            entityId: $bus->id,
            old: $oldValues,
            new: $bus->fresh()->toArray()
        );

        return response()->json([
            'success' => true,
            'data'    => new BusResource($bus->fresh(['driver'])),
            'message' => 'Bus updated successfully.',
        ]);
    }

    /**
     * Return calendar entries for a specific bus within a year-month window.
     * Each entry = { date, type, reference_id, reference_no, seat_map? }
     */
    public function calendar(Request $request, Bus $bus): JsonResponse
    {
        $month = $request->get('month', now()->month);
        $year  = $request->get('year',  now()->year);

        $start = \Carbon\Carbon::create($year, $month, 1)->startOfDay();
        $end   = $start->copy()->endOfMonth()->endOfDay();

        // Trip tickets for this bus (by bus_id FK or plate_no fallback)
        $tripTickets = \App\Models\TripTicket::where(function ($q) use ($bus) {
                $q->where('bus_id', $bus->id)
                  ->orWhere('plate_no', $bus->plate_number);
            })
            ->whereBetween('date_of_travel', [$start->toDateString(), $end->toDateString()])
            ->get(['id', 'control_no', 'date_of_travel', 'pick_up', 'drop_off', 'no_of_passengers', 'status']);

        // POS invoices linked to this bus
        $invoices = \App\Models\Invoice::where('bus_id', $bus->id)
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'invoice_number', 'created_at', 'customer_name', 'seat_map', 'status', 'total_amount']);

        $entries = [];

        foreach ($tripTickets as $tt) {
            $entries[] = [
                'date'         => $tt->date_of_travel,
                'type'         => 'trip_ticket',
                'reference_id' => $tt->id,
                'reference_no' => $tt->control_no,
                'pick_up'      => $tt->pick_up,
                'drop_off'     => $tt->drop_off,
                'pax'          => $tt->no_of_passengers,
                'status'       => $tt->status,
                'seat_map'     => null,
            ];
        }

        foreach ($invoices as $inv) {
            $entries[] = [
                'date'          => $inv->created_at->toDateString(),
                'type'          => 'invoice',
                'reference_id'  => $inv->id,
                'reference_no'  => $inv->invoice_number,
                'customer_name' => $inv->customer_name,
                'status'        => $inv->status,
                'seat_map'      => $inv->seat_map,
                'total_amount'  => $inv->total_amount,
            ];
        }

        // Sort by date
        usort($entries, fn($a, $b) => strcmp($a['date'], $b['date']));

        return response()->json([
            'success' => true,
            'data'    => $entries,
            'bus'     => [
                'id'               => $bus->id,
                'plate_number'     => $bus->plate_number,
                'model'            => $bus->model,
                'seating_capacity' => $bus->seating_capacity,
                'bus_category'     => $bus->bus_category,
            ],
            'month'   => (int) $month,
            'year'    => (int) $year,
        ]);
    }
}

