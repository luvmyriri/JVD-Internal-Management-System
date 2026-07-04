<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Liquidation;
use App\Services\LiquidationService;
use Illuminate\Http\Request;

class LiquidationController extends Controller
{
    protected LiquidationService $service;

    public function __construct(LiquidationService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $query = Liquidation::with(['items', 'tripTicket', 'employee', 'workOrder', 'purchaseOrder', 'cashBudgetRequest']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('source_type')) {
            $query->where('source_type', $request->source_type);
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        $liquidations = $query->orderByDesc('created_at')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $liquidations->items(),
            'meta' => [
                'current_page' => $liquidations->currentPage(),
                'last_page'    => $liquidations->lastPage(),
                'per_page'     => $liquidations->perPage(),
                'total'        => $liquidations->total(),
            ],
        ]);
    }

    public function show(Liquidation $liquidation)
    {
        $liquidation->load(['items', 'tripTicket', 'employee', 'workOrder', 'purchaseOrder', 'cashBudgetRequest']);
        return response()->json(['success' => true, 'data' => $liquidation]);
    }

    public function settle(Request $request, Liquidation $liquidation)
    {
        $user = auth()->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive')) {
            return response()->json(['error' => 'Unauthorized to settle liquidations.'], 403);
        }
        $request->validate([
            'items' => 'required|array',
            'items.*.expense_category' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0',
            'total_returned' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $settled = $this->service->settleLiquidation(
            $liquidation,
            $request->items,
            $request->total_returned,
            $request->notes
        );

        return response()->json(['success' => true, 'data' => $settled->load(['items', 'tripTicket', 'employee', 'workOrder', 'purchaseOrder'])]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager')) {
            return response()->json(['error' => 'Unauthorized to create liquidations.'], 403);
        }

        $validated = $request->validate([
            'trip_ticket_id'    => 'nullable|exists:trip_tickets,id',
            'work_order_id'     => 'nullable|exists:work_orders,id',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            'employee_id'       => 'required|exists:users,id',
            'total_advanced'    => 'required|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        $sourceType = 'general';
        if (!empty($validated['purchase_order_id']) || !empty($validated['work_order_id'])) {
            $sourceType = 'maintenance';
        } elseif (!empty($validated['trip_ticket_id'])) {
            $sourceType = 'dtt';
        }

        $liquidation = Liquidation::create([
            ...$validated,
            'source_type' => $sourceType,
            'status'      => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data' => $liquidation->load(['tripTicket', 'employee', 'workOrder', 'purchaseOrder']),
            'message' => 'Liquidation created successfully.',
        ], 201);
    }

    public function update(Request $request, Liquidation $liquidation)
    {
        $user = auth()->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive')) {
            return response()->json(['error' => 'Unauthorized to update liquidations.'], 403);
        }

        if ($liquidation->status === 'settled') {
            return response()->json(['error' => 'Cannot update a settled liquidation.'], 422);
        }

        $validated = $request->validate([
            'total_advanced' => 'sometimes|numeric|min:0',
            'notes'          => 'nullable|string',
            'status'         => 'sometimes|in:pending,under_review,disputed',
        ]);

        $liquidation->update($validated);

        return response()->json([
            'success' => true,
            'data' => $liquidation->load(['items', 'tripTicket', 'employee', 'workOrder', 'purchaseOrder']),
            'message' => 'Liquidation updated successfully.',
        ]);
    }

    public function destroy(Liquidation $liquidation)
    {
        $user = auth()->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president')) {
            return response()->json(['error' => 'Unauthorized to delete liquidations.'], 403);
        }

        if ($liquidation->status === 'settled') {
            return response()->json(['error' => 'Cannot delete a settled liquidation.'], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($liquidation) {
            $liquidation->items()->delete();
            $liquidation->delete();
        });

        return response()->json(['success' => true, 'message' => 'Liquidation deleted successfully.']);
    }
}
