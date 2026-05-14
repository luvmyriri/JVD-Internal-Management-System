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
        if (!$user->hasRole('super_admin', 'admin')) {
            $query->where('created_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('service_type')) {
            $query->where('service_type', $request->service_type);
        }

        $jos = $query->orderByDesc('service_date')
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
