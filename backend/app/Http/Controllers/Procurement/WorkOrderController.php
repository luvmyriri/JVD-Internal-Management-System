<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Http\Services\WorkOrderService;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(private WorkOrderService $service) {}

    /**
     * List Work Orders — filterable by bus, status, priority.
     */
    public function index(Request $request): JsonResponse
    {
        $query = WorkOrder::with(['bus', 'assignee']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('bus_id')) {
            $query->where('bus_id', $request->bus_id);
        }

        $wos = $query->orderByDesc('created_at')
                     ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => WorkOrderResource::collection($wos),
            'meta'    => [
                'current_page' => $wos->currentPage(),
                'last_page'    => $wos->lastPage(),
                'per_page'     => $wos->perPage(),
                'total'        => $wos->total(),
            ],
        ]);
    }

    /**
     * Create a new Work Order manually.
     */
    public function store(StoreWorkOrderRequest $request): JsonResponse
    {
        $wo = $this->service->create($request->validated(), $request->user()->id);

        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($wo->load(['bus', 'assignee'])),
            'message' => 'Work Order created successfully.',
        ], 201);
    }

    /**
     * Get a single Work Order.
     */
    public function show(WorkOrder $workOrder): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($workOrder->load(['bus', 'assignee'])),
        ]);
    }

    /**
     * Update a Work Order (status transition or field patch).
     */
    public function update(Request $request, WorkOrder $workOrder): JsonResponse
    {
        if ($request->filled('status')) {
            try {
                $workOrder = $this->service->updateStatus($workOrder, $request->status);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        $validated = $request->validate([
            'assigned_to'=> ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'priority'   => ['sometimes', 'in:low,medium,high,critical'],
            'description'=> ['sometimes', 'string', 'max:2000'],
            'parts_used' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'cost'       => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $workOrder->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee'])),
            'message' => 'Work Order updated.',
        ]);
    }
}
