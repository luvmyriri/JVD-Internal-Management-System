<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJobOrderRequest;
use App\Http\Resources\JobOrderResource;
use App\Http\Services\JobOrderService;
use App\Models\InventoryItem;
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
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('jo_number', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%");
            });
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
        if ($request->user()->hasRole('driver')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

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
                $jobOrder->load(['customer', 'bus', 'passengers', 'legalDocuments', 'driver', 'tripTicket', 'purchaseOrder', 'workOrder', 'items'])
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
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
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
        if ($request->user()->hasRole('driver')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($jobOrder->purchase_order_id) {
            return response()->json([
                'success' => false,
                'message' => "A Purchase Order has already been generated for this Job Order.",
            ], 422);
        }

        $validated = $request->validate([
            'supplier_id' => [
                'required',
                'integer',
                'exists:suppliers,id',
                function ($attribute, $value, $fail) {
                    $supplier = \App\Models\Supplier::with('accreditations')->find($value);
                    if ($supplier && $supplier->accreditation_status !== 'accredited') {
                        $fail('The selected supplier must be accredited to issue a purchase order.');
                    }
                    if ($supplier && $supplier->accreditations()->where('status', 'active')->count() === 0) {
                        $fail('The selected supplier lacks an active accreditation record.');
                    }
                }
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0.01'],
        ]);

        $po = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $request, $jobOrder) {
            $year = now()->year;
            // Lock the latest row so concurrent requests serialize and cannot read the same
            // sequence number (mirrors PurchaseOrderService::generatePONumber()).
            $latest = \App\Models\PurchaseOrder::withTrashed()
                ->where('po_number', 'like', "PO-{$year}-%")
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
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

            return $po;
        });

        return response()->json([
            'success' => true,
            'data'    => $po->load('lineItems'),
            'message' => 'Purchase Order generated successfully.',
        ], 201);
    }

    public function checkSupplies(JobOrder $jobOrder): JsonResponse
    {
        $items = $jobOrder->items()->get();

        if ($items->isEmpty()) {
            return response()->json([
                'success' => true,
                'data'    => [],
                'message' => 'No items attached to this Job Order.',
            ]);
        }

        $results = $items->map(function ($item) {
            $normalized = strtolower(trim($item->item_description));
            $inventoryItem = InventoryItem::whereRaw('LOWER(TRIM(item_name)) = ?', [$normalized])->first();

            $available = $inventoryItem ? (int) $inventoryItem->quantity : 0;
            $needed = (int) $item->quantity;

            return [
                'item_description'   => $item->item_description,
                'quantity_needed'    => $needed,
                'quantity_available' => $available,
                'is_sufficient'      => $available >= $needed,
                'requires_po'        => !$inventoryItem || $available < $needed,
                'inventory_item_id'  => $inventoryItem?->id,
            ];
        });

        return response()->json([
            'success'     => true,
            'data'        => $results,
            'all_sufficient' => $results->every(fn ($r) => $r['is_sufficient']),
        ]);
    }

    public function availableSupplies(Request $request): JsonResponse
    {
        $query = InventoryItem::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $items = $query->orderBy('item_name')
            ->get()
            ->map(fn ($item) => [
                'id'            => $item->id,
                'item_name'     => $item->item_name,
                'category'      => $item->category,
                'quantity'      => (int) $item->quantity,
                'reorder_level' => (int) $item->reorder_level,
                'unit'          => $item->unit,
                'unit_cost'     => $item->unit_cost,
                'is_low_stock'  => $item->quantity <= $item->reorder_level,
            ]);

        return response()->json([
            'success' => true,
            'data'    => $items,
        ]);
    }
}
