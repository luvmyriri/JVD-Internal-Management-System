<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJobOrderRequest;
use App\Http\Resources\JobOrderResource;
use App\Http\Services\JobOrderService;
use App\Models\JobOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobOrderController extends Controller
{
    public function __construct(private JobOrderService $service) {}

    /**
     * List Job Orders — agents only see their own.
     */
    public function index(Request $request): JsonResponse
    {
        $query = JobOrder::with(['customer', 'bus']);

        $user = $request->user();

        if ($user->hasRole('driver')) {
            // Drivers only see job orders for their assigned bus
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if (!$assignedBus) {
                return response()->json(['success' => true, 'data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => 20]]);
            }
            $query->where('bus_id', $assignedBus->id);
        } elseif (!$user->hasRole('super_admin', 'admin')) {
            $query->where('created_by', $user->id);
        }

        // Optional filters (all roles)
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('service_type')) {
            $query->where('service_type', $request->service_type);
        }
        if ($request->filled('bus_id')) {
            $query->where('bus_id', $request->bus_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('service_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('service_date', '<=', $request->date_to);
        }

        $jos = $query->orderBy('service_date')
                     ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => JobOrderResource::collection($jos)->resolve(),
            'meta'    => [
                'current_page' => $jos->currentPage(),
                'last_page'    => $jos->lastPage(),
                'per_page'     => $jos->perPage(),
                'total'        => $jos->total(),
            ],
        ]);
    }

    /**
     * Create a new Job Order draft.
     */
    public function store(StoreJobOrderRequest $request): JsonResponse
    {
        $jo = $this->service->create($request->validated(), $request->user()->id);

        return response()->json([
            'success' => true,
            'data'    => new JobOrderResource($jo),
            'message' => 'Job Order created successfully.',
        ], 201);
    }

    /**
     * Get a single Job Order with all relationships.
     */
    public function show(JobOrder $jobOrder): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new JobOrderResource(
                $jobOrder->load(['customer', 'bus', 'passengers', 'legalDocuments'])
            ),
        ]);
    }

    /**
     * Update a Job Order (status transition or field update).
     */
    public function update(Request $request, JobOrder $jobOrder): JsonResponse
    {
        // If a status change is requested, run through the service state machine
        if ($request->filled('status')) {
            try {
                $jobOrder = $this->service->updateStatus($jobOrder, $request->status);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        // Allow field updates for drafts only
        if ($jobOrder->status === 'draft') {
            $validated = $request->validate([
                'destination' => ['sometimes', 'string', 'max:255'],
                'service_date'=> ['sometimes', 'date'],
                'total_cost'  => ['sometimes', 'numeric', 'min:0'],
                'notes'       => ['nullable', 'string', 'max:1000'],
            ]);
            $jobOrder->update($validated);
        }

        return response()->json([
            'success' => true,
            'data'    => new JobOrderResource($jobOrder->fresh(['customer', 'bus'])),
            'message' => 'Job Order updated.',
        ]);
    }
}
