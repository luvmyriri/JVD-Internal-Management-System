<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Http\Requests\ReviewPurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Http\Services\PurchaseOrderService;
use App\Models\PurchaseOrder;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Services\AuditLogService;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseOrderService $service) {}

    /**
     * List Purchase Orders — filterable by status, paginated.
     * Agents only see POs they created; admins see all.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['supplier', 'creator', 'lineItems']);

        // Non-admins only see their own POs
        $user = $request->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager', 'accounting_executive')) {
            $query->where('created_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('po_number')) {
            $query->where('po_number', $request->po_number);
        }

        if ($request->filled('search')) {
            $query->where('po_number', 'like', "%{$request->search}%");
        }

        $pos = $query->orderByDesc('created_at')
                     ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => PurchaseOrderResource::collection($pos)->resolve(),
            'meta'    => [
                'current_page' => $pos->currentPage(),
                'last_page'    => $pos->lastPage(),
                'per_page'     => $pos->perPage(),
                'total'        => $pos->total(),
            ],
        ]);
    }

    /**
     * Create a new PO draft with line items.
     */
    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $po = $this->service->create($request->validated(), $request->user()->id);

        AuditLogService::log(
            action: 'CREATE_PO',
            module: 'purchase-orders',
            entityType: 'purchase_order',
            entityId: $po->id,
            new: $po->toArray()
        );

        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource($po->load(['supplier', 'lineItems'])),
            'message' => 'Purchase Order draft created successfully.',
        ], 201);
    }

    /**
     * Get a single PO with all its line items and supplier info.
     */
    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource(
                $purchaseOrder->load(['supplier', 'lineItems', 'creator', 'verifier', 'approver'])
            ),
        ]);
    }

    /**
     * Agent submits a draft PO for Accounting review.
     * Transition: draft → pending_accounting_review
     */
    public function submit(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => "Only draft P.O.s can be submitted. Current status: {$purchaseOrder->status}.",
            ], 422);
        }

        $purchaseOrder->update(['status' => 'pending_accounting_review']);

        \App\Http\Services\NotificationService::notifyPoSubmission($purchaseOrder);

        AuditLogService::log(
            action: 'SUBMIT_PO',
            module: 'purchase-orders',
            entityType: 'purchase_order',
            entityId: $purchaseOrder->id,
            new: ['status' => 'pending_accounting_review']
        );

        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource($purchaseOrder->fresh(['supplier', 'lineItems'])),
            'message' => 'P.O. submitted for Accounting review.',
        ]);
    }

    /**
     * Accounting verifies or rejects the PO.
     * Transition: pending_accounting_review → verified | rejected
     */
    public function verify(ReviewPurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'pending_accounting_review') {
            return response()->json([
                'success' => false,
                'message' => 'This P.O. is not pending accounting review.',
            ], 422);
        }

        $oldStatus = $purchaseOrder->status;
        $purchaseOrder->update([
            'status'          => $request->approved ? 'pending_ceo_approval' : 'rejected',
            'verified_by'     => auth()->id(),
            'rejection_notes' => $request->approved ? null : $request->notes,
        ]);


        // Inventory update moved to approve method only
        \App\Http\Services\NotificationService::notifyPoStatusUpdate($purchaseOrder, $purchaseOrder->status);

        AuditLogService::log(
            action: $request->approved ? 'VERIFY_PO' : 'REJECT_PO',
            module: 'purchase-orders',
            entityType: 'purchase_order',
            entityId: $purchaseOrder->id,
            old: ['status' => $oldStatus],
            new: ['status' => $purchaseOrder->status, 'verified_by' => auth()->id()]
        );

        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource($purchaseOrder->fresh(['supplier', 'lineItems'])),
            'message' => $request->approved ? 'P.O. verified and forwarded for approval.' : 'P.O. rejected.',
        ]);
    }

    /**
     * CEO / Super Admin gives final approval or rejection.
     * Transition: verified → approved | rejected
     */
    public function approve(ReviewPurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (!auth()->user()->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only super admin, executive vice president, or purchasing manager can approve P.O.s.',
            ], 403);
        }

        if ($purchaseOrder->status !== 'pending_ceo_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Only verified P.O.s can be approved.',
            ], 422);
        }

        $oldStatus = $purchaseOrder->status;
        $purchaseOrder->update([
            'status'          => $request->approved ? 'approved' : 'rejected',
            'approved_by'     => auth()->id(),
            'approved_at'     => $request->approved ? now() : null,
            'rejection_notes' => $request->approved ? null : $request->notes,
        ]);


        if ($request->approved) {
            foreach ($purchaseOrder->lineItems as $item) {
                $inventory = InventoryItem::firstOrCreate(
                    ['item_name' => $item->item_name],
                    [
                        'category' => 'General',
                        'quantity' => 0,
                        'reorder_level' => 10,
                        'unit' => $item->unit_of_measure ?? 'pcs',
                        'unit_cost' => $item->unit_price,
                    ]
                );
                
                $inventory->quantity += $item->quantity;
                $inventory->unit_cost = $item->unit_price;
                $inventory->save();
            }

            // Automatically create a Cash Budget Request for the approved P.O.
            $jo = \App\Models\JobOrder::where('purchase_order_id', $purchaseOrder->id)->first();
            $plateNumber = $jo?->bus?->plate_number ?? $jo?->plate_no;

            \App\Models\CashBudgetRequest::create([
                'date' => now()->toDateString(),
                'total_amount' => $purchaseOrder->total_amount,
                'status' => 'draft',
                'prepared_by' => auth()->id() ?? 1,
                'purchase_order_id' => $purchaseOrder->id,
                'plate_number' => $plateNumber,
                'destination' => "Maintenance/Repair PO #{$purchaseOrder->po_number}",
            ]);
        }

        \App\Http\Services\NotificationService::notifyPoStatusUpdate($purchaseOrder, $purchaseOrder->status);

        AuditLogService::log(
            action: $request->approved ? 'APPROVE_PO' : 'REJECT_PO',
            module: 'purchase-orders',
            entityType: 'purchase_order',
            entityId: $purchaseOrder->id,
            old: ['status' => $oldStatus],
            new: ['status' => $purchaseOrder->status, 'approved_by' => auth()->id()]
        );

        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource($purchaseOrder->fresh(['supplier', 'lineItems'])),
            'message' => $request->approved ? 'P.O. approved.' : 'P.O. rejected.',
        ]);
    }
}
