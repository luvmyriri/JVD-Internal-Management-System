<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Services\MaintenanceService;
use App\Services\WorkOrderService;
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

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('wo_number', 'like', "%{$search}%")
                  ->orWhereHas('bus', fn ($sq) => $sq->where('plate_number', 'like', "%{$search}%"));
            });
        }

        // Date range (inclusive) for the shared timeframe filter.
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
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
    public function update(\App\Http\Requests\UpdateWorkOrderRequest $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // C-09: validate all field input BEFORE performing any status transition, so a
        // validation failure cannot leave an already-committed status change behind.
        $validated = $request->validated();

        $wasCompleted = false;

        if ($request->filled('status')) {
            try {
                $workOrder = $this->service->updateStatus($workOrder, $request->status);
                $wasCompleted = $request->status === 'completed';
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

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
    public function approve(\App\Http\Requests\ApproveWorkOrderRequest $request, WorkOrder $workOrder): JsonResponse
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
            \App\Services\NotificationService::notifyWorkOrderVerification($workOrder);

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

            $validated = $request->validated();

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
                'message' => 'Work Order filed and approved. Ready for maintenance work.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "This Work Order is in status '{$workOrder->status}' and cannot be approved/verified.",
        ], 422);
    }

    private function generateJobOrderInternal(Request $request, WorkOrder $workOrder, bool $requiresPo = false): \App\Models\JobOrder
    {
        // Avoid duplicate JOs
        $existing = \App\Models\JobOrder::where('work_order_id', $workOrder->id)->first();
        if ($existing) {
            return $existing;
        }

        $year = now()->year;
        $latest = \App\Models\JobOrder::withTrashed()->where('jo_number', 'like', "JO-{$year}-%")->orderByDesc('id')->first();
        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->jo_number);
            $sequence = (int) end($parts) + 1;
        }
        $joNumber = sprintf('JO-%d-%04d', $year, $sequence);

        $invoice = $workOrder->invoice;
        $busId = $workOrder->bus_id ?: ($invoice?->bus_id ?? null);
        $driverId = null;
        $driverName = null;

        if ($invoice && $invoice->driver_id) {
            $driverId = $invoice->driver_id;
            $driverUser = \App\Models\User::find($driverId);
            if ($driverUser) {
                $driverName = "{$driverUser->first_name} {$driverUser->last_name}";
            }
        } elseif ($busId) {
            $bus = \App\Models\Bus::find($busId);
            if ($bus) {
                $driverId = $bus->assigned_driver;
                if ($bus->driver) {
                    $driverName = "{$bus->driver->first_name} {$bus->driver->last_name}";
                }
            }
        }

        $serviceType = $workOrder->isTrip() ? 'bus_rental' : 'maintenance';
        $destination = $workOrder->isTrip() ? ($invoice?->customer_address ?? 'TBD') : 'Internal Maintenance';
        $notes = $workOrder->isTrip() 
            ? 'Generated from Trip Work Order ' . $workOrder->wo_number 
            : 'Generated from Maintenance Work Order ' . $workOrder->wo_number;

        $jo = \App\Models\JobOrder::create([
            'jo_number' => $joNumber,
            'customer_id' => $invoice?->customer_id,
            'bus_id' => $busId,
            'driver_id' => $driverId,
            'driver_name' => $driverName,
            'work_order_id' => $workOrder->id,
            'invoice_id' => $workOrder->invoice_id,
            'created_by' => auth()->id() ?? 1,
            'requested_by' => $workOrder->assigned_to ?? $workOrder->created_by ?? auth()->id() ?? 1,
            'service_type' => $serviceType,
            'status' => 'created',
            'service_date' => $invoice?->due_date ?? now()->toDateString(),
            'destination' => $destination,
            'total_cost' => $workOrder->cost ?? 0,
            'notes' => $notes,
            'requires_po' => $requiresPo,
        ]);

        return $jo;
    }
    /**
     * Designated employee rejects a requested WO.
     * Transitions: pending_approval | verified → cancelled
     */
    public function reject(\App\Http\Requests\RejectWorkOrderRequest $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'head_mechanic', 'service_adviser')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (!in_array($workOrder->status, ['pending_approval', 'verified'])) {
            return response()->json([
                'success' => false,
                'message' => "This Work Order is in status '{$workOrder->status}' and cannot be rejected.",
            ], 422);
        }

        $validated = $request->validated();

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

    /**
     * Generate a maintenance Job Order from a Work Order.
     */
    public function generateJobOrder(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Check if a Job Order is already linked to this Work Order
        $existingJo = \App\Models\JobOrder::where('work_order_id', $workOrder->id)->first();
        if ($existingJo) {
            return response()->json([
                'success' => false,
                'message' => 'A Job Order has already been generated for this Work Order.',
            ], 422);
        }

        // C-07: create the Job Order and advance the Work Order status atomically. The sequence
        // number is generated inside the transaction under lockForUpdate so two concurrent
        // requests can't read the same "latest" JO and produce duplicate jo_numbers.
        $jo = \Illuminate\Support\Facades\DB::transaction(function () use ($workOrder, $user) {
            $year = now()->year;
            $latest = \App\Models\JobOrder::withTrashed()
                ->where('jo_number', 'like', "JO-{$year}-%")
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
            $sequence = 1;
            if ($latest) {
                $parts = explode('-', $latest->jo_number);
                $sequence = (int) end($parts) + 1;
            }
            $joNumber = sprintf('JO-%d-%04d', $year, $sequence);

            $jo = \App\Models\JobOrder::create([
                'jo_number' => $joNumber,
                'customer_id' => 1, // Walk-in / Internal Maintenance default customer
                'bus_id' => $workOrder->bus_id,
                'driver_id' => $workOrder->assigned_to,
                'created_by' => $user->id,
                'service_type' => 'maintenance',
                'status' => 'created',
                'service_date' => now()->toDateString(),
                'destination' => 'Internal Shop',
                'total_cost' => $workOrder->cost ?? 0,
                'notes' => "Auto-generated from Work Order {$workOrder->wo_number}. Description: {$workOrder->description}",
                'work_order_id' => $workOrder->id,
            ]);

            // Advance WO to in_progress once a JO is linked
            $workOrder->update(['status' => 'in_progress']);

            return $jo;
        });

        return response()->json([
            'success' => true,
            'data' => new \App\Http\Resources\JobOrderResource($jo->load('bus')),
            'message' => 'Job Order generated successfully.',
        ], 201);
    }
}

