<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePassengerRequest;
use App\Http\Resources\PassengerResource;
use App\Models\Passenger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PassengerController extends Controller
{
    /**
     * List passengers — filterable by customer_id.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Passenger::with('customer');

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('passport_no', 'ilike', "%{$search}%");
            });
        }

        $passengers = $query->orderBy('last_name')
                            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => PassengerResource::collection($passengers),
            'meta'    => [
                'current_page' => $passengers->currentPage(),
                'last_page'    => $passengers->lastPage(),
                'per_page'     => $passengers->perPage(),
                'total'        => $passengers->total(),
            ],
        ]);
    }

    /**
     * Create a new passenger under a customer.
     */
    public function store(StorePassengerRequest $request): JsonResponse
    {
        $passenger = Passenger::create($request->validated());

        return response()->json([
            'success' => true,
            'data'    => new PassengerResource($passenger->load('customer')),
            'message' => 'Passenger created successfully.',
        ], 201);
    }

    /**
     * Get a single passenger with their customer.
     */
    public function show(Passenger $passenger): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new PassengerResource($passenger->load('customer')),
        ]);
    }

    /**
     * Update passenger details.
     */
    public function update(Request $request, Passenger $passenger): JsonResponse
    {
        $validated = $request->validate([
            'first_name'       => ['sometimes', 'string', 'max:100'],
            'last_name'        => ['sometimes', 'string', 'max:100'],
            'birth_date'       => ['nullable', 'date', 'before:today'],
            'passport_no'      => ['nullable', 'string', 'max:50'],
            'contact_no'       => ['nullable', 'string', 'max:30'],
            'checklist_status' => ['nullable', 'array'],
        ]);

        $passenger->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new PassengerResource($passenger->fresh(['customer'])),
            'message' => 'Passenger updated successfully.',
        ]);
    }
}
