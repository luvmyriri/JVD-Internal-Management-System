<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Http\Requests\ReviewPurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Http\Services\PurchaseOrderService;
use App\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseOrderService $service) {}

    /**
     * List Purchase Orders — filterable by status, paginated.
     * Agents only see POs they created; admins see all.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['supplier', 'creator']);

        // Non-admins only see their own POs
        $user = $request->user();
        if (!$user->hasRole('super_admin', 'admin', 'accounting')) {
            $query->where('created_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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

        $purchaseOrder->update([
            'status'          => $request->approved ? 'verified' : 'rejected',
            'verified_by'     => $request->user()->id,
            'rejection_notes' => $request->approved ? null : $request->notes,
        ]);

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
        if ($purchaseOrder->status !== 'verified') {
            return response()->json([
                'success' => false,
                'message' => 'Only verified P.O.s can be approved.',
            ], 422);
        }

        $purchaseOrder->update([
            'status'          => $request->approved ? 'approved' : 'rejected',
            'approved_by'     => $request->user()->id,
            'approved_at'     => $request->approved ? now() : null,
            'rejection_notes' => $request->approved ? null : $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'data'    => new PurchaseOrderResource($purchaseOrder->fresh(['supplier', 'lineItems'])),
            'message' => $request->approved ? 'P.O. approved.' : 'P.O. rejected.',
        ]);
    }
}
