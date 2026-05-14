<?php

namespace App\Http\Controllers\Fleet;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBusRequest;
use App\Http\Resources\BusResource;
use App\Models\Bus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusController extends Controller
{
    /**
     * List all buses — filterable by status, searchable by plate/model.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Bus::with('driver');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('plate_number', 'ilike', "%{$search}%")
                  ->orWhere('model', 'ilike', "%{$search}%");
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
    public function show(Bus $bus): JsonResponse
    {
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
            'seating_capacity'  => ['sometimes', 'integer', 'min:1', 'max:120'],
            'status'            => ['sometimes', 'in:available,in_service,under_maintenance,decommissioned'],
            'total_mileage'     => ['sometimes', 'numeric', 'min:0'],
            'last_service_date' => ['nullable', 'date'],
            'next_service_due'  => ['nullable', 'date'],
            'assigned_driver'   => ['nullable', 'integer', 'exists:users,id'],
            'plate_number'      => ['sometimes', 'string', 'max:20', 'unique:buses,plate_number,' . $bus->id],
        ]);

        $bus->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new BusResource($bus->fresh(['driver'])),
            'message' => 'Bus updated successfully.',
        ]);
    }
}
