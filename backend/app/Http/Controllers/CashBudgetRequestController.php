<?php

namespace App\Http\Controllers;

use App\Models\CashBudgetRequest;
use Illuminate\Http\Request;

class CashBudgetRequestController extends Controller
{
    public function index()
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'purchaseOrder.lineItems'])->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'travel_date' => 'nullable|date',
            'plate_number' => 'nullable|string',
            'destination' => 'nullable|string',
            'diesel' => 'nullable|numeric',
            'meal_allowance' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',
            'easytrip' => 'nullable|numeric',
            'coach_captain_salary' => 'nullable|numeric',
            'spare_driver_salary' => 'nullable|numeric',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
        ]);

        $validated['prepared_by'] = auth()->id();
        $validated['total_amount'] = collect($validated)->only([
            'diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'
        ])->sum();
        
        $budget = CashBudgetRequest::create($validated);
        
        return $budget->load(['preparedBy', 'approvedBy', 'purchaseOrder.lineItems']);
    }

    public function show($id)
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'purchaseOrder.lineItems'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $budget = CashBudgetRequest::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,approved,disbursed',
            'diesel' => 'sometimes|numeric',
            'meal_allowance' => 'sometimes|numeric',
            'sop' => 'sometimes|numeric',
            'autosweep' => 'sometimes|numeric',
            'easytrip' => 'sometimes|numeric',
            'coach_captain_salary' => 'sometimes|numeric',
            'spare_driver_salary' => 'sometimes|numeric',
            'purchase_order_id' => 'sometimes|nullable|exists:purchase_orders,id',
        ]);

        // If any amounts are updated, recalculate total
        $amounts = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'];
        $needsRecalculation = false;
        foreach ($amounts as $amount) {
            if ($request->has($amount)) {
                $needsRecalculation = true;
                break;
            }
        }

        $budget->update($validated);

        if ($needsRecalculation) {
            // Re-check if this is a PO budget (amounts are 0, total_amount might be fixed from PO)
            if (!$budget->purchase_order_id) {
                $budget->update([
                    'total_amount' => $budget->only($amounts) ? collect($budget->only($amounts))->sum() : 0
                ]);
            }
        }

        if ($request->has('status') && $request->status === 'approved') {
            $budget->update(['approved_by' => auth()->id()]);

            // Auto-generate invoice in Billing if it doesn't exist yet
            $existingInvoice = \App\Models\Invoice::where('cash_budget_request_id', $budget->id)->first();
            if (!$existingInvoice) {
                // Find or create a generic service for PO/Internal Billing
                $service = \App\Models\Service::firstOrCreate(
                    ['name' => 'Procurement Expense'],
                    [
                        'category' => 'Internal',
                        'price' => 0,
                        'is_active' => true,
                        'created_by' => auth()->id() ?? 1,
                    ]
                );

                $customerName = 'Internal Expense';
                if ($budget->purchase_order_id) {
                    $po = \App\Models\PurchaseOrder::with('supplier')->find($budget->purchase_order_id);
                    if ($po && $po->supplier) {
                        $customerName = $po->supplier->name;
                    }
                }

                $invoice = \App\Models\Invoice::create([
                    'invoice_number' => 'INV-CB-' . strtoupper(\Illuminate\Support\Str::random(6)),
                    'customer_name' => $customerName,
                    'subtotal' => $budget->total_amount,
                    'tax_amount' => 0,
                    'total_amount' => $budget->total_amount,
                    'amount_received' => 0,
                    'change' => 0,
                    'payment_method' => 'Cash',
                    'payment_type' => 'full',
                    'balance' => $budget->total_amount,
                    'status' => 'pending_payment',
                    'created_by' => auth()->id() ?? 1,
                    'notes' => 'Auto-generated from Cash Budget Request #' . $budget->id,
                    'cash_budget_request_id' => $budget->id,
                ]);

                \App\Models\InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $service->id,
                    'quantity' => 1,
                    'unit_price' => $budget->total_amount,
                    'total_price' => $budget->total_amount,
                ]);
            }
        }

        return $budget->load(['preparedBy', 'approvedBy', 'purchaseOrder.lineItems']);
    }

    public function destroy($id)
    {
        CashBudgetRequest::findOrFail($id)->delete();
        return response()->json(['message' => 'Cash budget request deleted successfully.']);
    }
}
