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
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            $query->where(function($q) use ($user, $assignedBus) {
                $q->where('driver_id', $user->id);
                if ($assignedBus) {
                    $q->orWhere('bus_id', $assignedBus->id);
                }
            });
        } elseif (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            $query->where('created_by', $user->id);
        }

        // Filter travel job orders for drivers to only show when cash budget is approved/disbursed/liquidated
        if ($user->hasRole('driver')) {
            $query->where(function ($q) {
                $q->where('service_type', 'maintenance')
                  ->orWhereHas('tripTicket.cashBudgetRequest', function ($subQ) {
                      $subQ->whereIn('status', ['approved', 'disbursed', 'liquidated']);
                  })
                  ->orWhereHas('workOrder.tripTicket.cashBudgetRequest', function ($subQ) {
                      $subQ->whereIn('status', ['approved', 'disbursed', 'liquidated']);
                  });
            });
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
    public function show(Request $request, JobOrder $jobOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if ((!$assignedBus || $assignedBus->id !== $jobOrder->bus_id) && $jobOrder->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        } elseif (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            if ($jobOrder->created_by !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data'    => new JobOrderResource(
                $jobOrder->load(['customer', 'bus', 'passengers', 'legalDocuments', 'driver', 'tripTicket', 'purchaseOrder', 'workOrder'])
            ),
        ]);
    }

    /**
     * Update a Job Order (status transition or field update).
     */
    public function update(Request $request, JobOrder $jobOrder): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            $assignedBus = \App\Models\Bus::where('assigned_driver', $user->id)->first();
            if ((!$assignedBus || $assignedBus->id !== $jobOrder->bus_id) && $jobOrder->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        } elseif (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            if ($jobOrder->created_by !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        // If a status change is requested, run through the service state machine
        if ($request->filled('status')) {
            try {
                $jobOrder = $this->service->updateStatus($jobOrder, $request->status);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        // Allow field updates for drafts only
        if ($jobOrder->status === 'created') {
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
    /**
     * Generate a Purchase Order from a Job Order.
     */
    public function generatePurchaseOrder(Request $request, JobOrder $jobOrder): JsonResponse
    {
        if ($jobOrder->purchase_order_id) {
            return response()->json([
                'success' => false,
                'message' => "A Purchase Order has already been generated for this Job Order.",
            ], 422);
        }

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $year = now()->year;
        $latest = \App\Models\PurchaseOrder::where('po_number', 'like', "PO-{$year}-%")->orderByDesc('id')->first();
        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->po_number);
            $sequence = (int) end($parts) + 1;
        }
        $poNumber = sprintf('PO-%d-%04d', $year, $sequence);

        $total = 0;
        foreach ($validated['items'] as $item) {
            $total += $item['quantity'] * $item['unit_price'];
        }

        $po = \App\Models\PurchaseOrder::create([
            'po_number' => $poNumber,
            'supplier_id' => $validated['supplier_id'],
            'created_by' => $request->user()->id,
            'status' => 'draft',
            'total_amount' => $total,
        ]);

        foreach ($validated['items'] as $item) {
            $po->lineItems()->create([
                'item_name' => $item['item_name'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total_price' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        $jobOrder->update(['purchase_order_id' => $po->id]);

        return response()->json([
            'success' => true,
            'data'    => $po->load('lineItems'),
            'message' => 'Purchase Order generated successfully.',
        ], 201);
    }
}
