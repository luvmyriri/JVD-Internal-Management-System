<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Http\Services\MaintenanceService;
use App\Http\Services\WorkOrderService;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(
        private WorkOrderService $service,
        private MaintenanceService $maintenanceService,
    ) {}

    /**
     * List Work Orders — filterable by bus, status, priority.
     */
    public function index(Request $request): JsonResponse
    {
        $query = WorkOrder::with(['bus', 'assignee']);

        $user = $request->user();

        if ($user->hasRole('driver')) {
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if (!$assignedBus) {
                return response()->json(['success' => true, 'data' => [], 'meta' => ['total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => 20]]);
            }
            $query->where('bus_id', $assignedBus->id);
        }

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
            'data'    => WorkOrderResource::collection($wos)->resolve(),
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
    public function show(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if (!$assignedBus || $assignedBus->id !== $workOrder->bus_id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($workOrder->load(['bus', 'assignee'])),
        ]);
    }

    /**
     * Update a Work Order (status transition or field patch).
     * When a PMS-auto-generated WO is marked 'completed', triggers
     * MaintenanceService::recalculateNextService() on the parent bus.
     */
    public function update(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if (!$assignedBus || $assignedBus->id !== $workOrder->bus_id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        $wasCompleted = false;

        if ($request->filled('status')) {
            try {
                $workOrder = $this->service->updateStatus($workOrder, $request->status);
                $wasCompleted = $request->status === 'completed';
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        $validated = $request->validate([
            'bus_id'     => ['sometimes', 'integer', 'exists:buses,id'],
            'assigned_to'=> ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'priority'   => ['sometimes', 'in:routine,urgent,critical'],
            'description'=> ['sometimes', 'string', 'max:2000'],
            'parts_used' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'cost'       => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $workOrder->update($validated);

        // PMS hook: recalculate bus service schedule when a maintenance WO is completed
        if ($wasCompleted && $workOrder->auto_generated && $workOrder->bus_id) {
            $this->maintenanceService->recalculateNextService($workOrder->bus);
        }

        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee'])),
            'message' => 'Work Order updated.',
        ]);
    }

    /**
     * Designated employee verifies or approves an auto-generated/requested WO.
     * Transitions: 
     *  - Head Mechanic: pending_approval → verified
     *  - Service Adviser: verified → open
     */
    /**
     * Designated employee verifies or approves an auto-generated/requested WO.
     * Transitions: 
     *  - Head Mechanic: pending_validation → pending_approval
     *  - Head Mechanic: pending_approval → verified
     *  - Service Adviser: verified → open
     *  - Trip Work Orders: direct transition from pending_approval → open
     */
    public function approve(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super_admin');

        // 0. Head Mechanic validate driver request
        if ($workOrder->status === 'pending_validation') {
            if (!$user->hasRole('super_admin', 'executive_vice_president', 'head_mechanic')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only head mechanic can validate driver maintenance requests.',
                ], 403);
            }

            $workOrder->update([
                'status' => 'pending_approval',
            ]);

            return response()->json([
                'success' => true,
                'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee'])),
                'message' => 'Maintenance request validated. Work Order is now pending approval.',
            ]);
        }

        // Direct approval of Trip Work Orders
        if ($workOrder->isTrip() && $workOrder->status === 'pending_approval') {
            if (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'logistics_in_charge', 'dispatcher', 'service_adviser')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only operations manager, logistics in charge, dispatcher, or service adviser can approve trip work orders.',
                ], 403);
            }

            $workOrder->update([
                'status'       => 'open',
                'approved_by'  => $user->id,
                'approved_at'  => now(),
            ]);

            return response()->json([
                'success' => true,
                'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee', 'approver'])),
                'message' => 'Trip Work Order approved.',
            ]);
        }

        // 1. Head Mechanic verify transition (for maintenance)
        if ($workOrder->status === 'pending_approval') {
            if (!$user->hasRole('super_admin', 'executive_vice_president', 'head_mechanic')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only head mechanic can verify pending work orders.',
                ], 403);
            }

            $workOrder->update([
                'status'      => 'verified',
                'verified_by' => $user->id,
                'verified_at' => now(),
            ]);

            // Notify Service Adviser for final filing approval
            \App\Http\Services\NotificationService::notifyWorkOrderVerification($workOrder);

            return response()->json([
                'success' => true,
                'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee'])),
                'message' => 'Work Order verified and passed to Service Adviser for final filing.',
            ]);
        }

        // 2. Service Adviser final approval transition (for maintenance)
        if ($workOrder->status === 'verified') {
            if (!$user->hasRole('super_admin', 'executive_vice_president', 'service_adviser')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only service adviser can file/approve verified work orders.',
                ], 403);
            }

            $validated = $request->validate([
                'notes'       => ['nullable', 'string', 'max:1000'],
                'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
                'priority'    => ['nullable', 'in:routine,urgent,critical'],
            ]);

            $workOrder->update([
                'status'       => 'open',
                'approved_by'  => $user->id,
                'approved_at'  => now(),
                'approval_notes' => $validated['notes'] ?? null,
                'assigned_to'  => $validated['assigned_to'] ?? $workOrder->assigned_to,
                'priority'     => $validated['priority'] ?? $workOrder->priority,
            ]);

            // Do not auto-generate J.O. as JO is the start of the flow
            

            return response()->json([
                'success' => true,
                'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee', 'approver'])),
                'message' => 'Work Order filed and approved. Job Order generated automatically.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "This Work Order is in status '{$workOrder->status}' and cannot be approved/verified.",
        ], 422);
    }

    /**
     * Designated employee rejects a requested WO.
     * Transitions: pending_approval | verified → cancelled
     */
    public function reject(Request $request, WorkOrder $workOrder): JsonResponse
    {
        if (!in_array($workOrder->status, ['pending_approval', 'verified'])) {
            return response()->json([
                'success' => false,
                'message' => "This Work Order is in status '{$workOrder->status}' and cannot be rejected.",
            ], 422);
        }

        $validated = $request->validate([
            'notes' => ['required', 'string', 'max:1000'],
        ]);

        $workOrder->update([
            'status'         => 'cancelled',
            'approved_by'    => $request->user()->id,
            'approved_at'    => now(),
            'approval_notes' => $validated['notes'],
        ]);

        return response()->json([
            'success' => true,
            'data'    => new WorkOrderResource($workOrder->fresh(['bus', 'assignee'])),
            'message' => 'Work Order rejected and cancelled.',
        ]);
    }
}

