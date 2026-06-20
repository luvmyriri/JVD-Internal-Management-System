<?php

namespace App\Http\Controllers;

use App\Models\CashBudgetRequest;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Http\Request;

class CashBudgetRequestController extends Controller
{
    public function index()
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice'])->latest()->get();
    }

    public function store(Request $request)
    {
        // C-05: drivers must not create cash budget requests directly (these are spawned
        // server-side from approved trip tickets / commissions).
        $user = auth()->user();
        if ($user && $user->hasRole('driver')) {
            return response()->json(['error' => 'Drivers cannot create cash budget requests.'], 403);
        }

        $validated = $request->validate([
            'date'                  => 'required|date',
            'travel_date'           => 'nullable|date',
            'plate_number'          => 'nullable|string',
            'destination'           => 'nullable|string',
            'diesel'                => 'nullable|numeric',
            'meal_allowance'        => 'nullable|numeric',
            'sop'                   => 'nullable|numeric',
            'autosweep'             => 'nullable|numeric',
            'easytrip'              => 'nullable|numeric',
            'coach_captain_salary'  => 'nullable|numeric',
            'spare_driver_salary'   => 'nullable|numeric',
            'purchase_order_id'     => 'nullable|exists:purchase_orders,id',
            'trip_ticket_id'        => 'nullable|exists:trip_tickets,id',
            'work_order_id'         => 'nullable|exists:work_orders,id',
        ]);

        $validated['prepared_by'] = auth()->id();

        if ($request->filled('purchase_order_id')) {
            $po = \App\Models\PurchaseOrder::find($request->purchase_order_id);
            $validated['total_amount'] = $po ? $po->total_amount : 0;
        } elseif ($request->filled('work_order_id')) {
            $wo = \App\Models\WorkOrder::find($request->work_order_id);
            $validated['total_amount'] = $wo ? ($wo->cost ?? 0) : 0;
        } elseif ($request->filled('total_amount')) {
            // General requests or direct amounts passed
            $validated['total_amount'] = $request->total_amount;
        } else {
            // Driver Trip Ticket or default breakdown sum
            $validated['total_amount'] = collect($validated)->only([
                'diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'
            ])->sum();
        }

        $budget = CashBudgetRequest::create($validated);

        return $budget->load(['preparedBy', 'approvedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
    }

    public function show($id)
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        if ($user->hasRole('driver')) {
            return response()->json(['error' => 'Drivers cannot update cash budget requests.'], 403);
        }

        if ($request->has('status')) {
            $newStatus = $request->status;
            if ($newStatus === 'approved') {
                if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive')) {
                    return response()->json(['error' => 'Unauthorized to approve cash budget requests.'], 403);
                }
            }
            if ($newStatus === 'disbursed') {
                if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager', 'dispatcher', 'service_adviser', 'logistics_in_charge', 'purchasing_manager')) {
                    return response()->json(['error' => 'Unauthorized to disburse cash budget requests.'], 403);
                }
            }
        }

        $budget = CashBudgetRequest::with(['tripTicket', 'purchaseOrder.supplier', 'workOrder'])->findOrFail($id);

        $validated = $request->validate([
            'status'               => 'sometimes|in:draft,pending_accounting,approved,disbursed',
            'diesel'               => 'sometimes|numeric',
            'meal_allowance'       => 'sometimes|numeric',
            'sop'                  => 'sometimes|numeric',
            'autosweep'            => 'sometimes|numeric',
            'easytrip'             => 'sometimes|numeric',
            'coach_captain_salary' => 'sometimes|numeric',
            'spare_driver_salary'  => 'sometimes|numeric',
            'purchase_order_id'    => 'sometimes|nullable|exists:purchase_orders,id',
            'trip_ticket_id'       => 'sometimes|nullable|exists:trip_tickets,id',
            'work_order_id'        => 'sometimes|nullable|exists:work_orders,id',
            'disbursed_amount'     => 'sometimes|numeric|nullable',
        ]);

        // C-05: once disbursed, the financial fields are locked — no post-disbursement tampering.
        if ($budget->status === 'disbursed') {
            $lockedFields = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary', 'disbursed_amount', 'total_amount'];
            foreach ($lockedFields as $f) {
                if ($request->has($f)) {
                    return response()->json([
                        'error' => 'Cannot modify amounts: this cash budget has already been disbursed.'
                    ], 422);
                }
            }
        }

        // Recalculate total if any amounts updated and it's a DTT flow
        $amounts = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'];
        $needsRecalculation = collect($amounts)->contains(fn($a) => $request->has($a));

        $budget->update($validated);

        if ($needsRecalculation && !$budget->purchase_order_id && !$budget->work_order_id && $budget->trip_ticket_id) {
            $budget->update([
                'total_amount' => collect($budget->only($amounts))->sum()
            ]);
        }

        // ── STEP 1: Operations forwards to accounting → notify accounting/super_admin ──────
        if ($request->has('status') && $request->status === 'pending_accounting') {
            $preparedByName = $budget->preparedBy?->first_name
                ? "{$budget->preparedBy->first_name} {$budget->preparedBy->last_name}"
                : 'Staff';

            $destination = $budget->destination ?? ($budget->tripTicket?->drop_off ?? 'N/A');
            $totalAmount = number_format($budget->total_amount, 2);
            $reference   = $budget->tripTicket?->control_no ?? ('CB-' . $budget->id);

            $title   = "Cash Budget Approval Required — {$reference}";
            $message = "{$preparedByName} submitted a cash budget of ₱{$totalAmount} for {$destination}. Please review and approve in Operations → Cash Budgets.";

            // Notify every accounting & super_admin user
            $accountingUsers = User::whereIn('role', ['super_admin', 'executive_vice_president', 'accounting_executive'])
                ->where('is_active', true)
                ->get();

            foreach ($accountingUsers as $accountingUser) {
                $accountingUser->notify(new SystemAlert(
                    $title,
                    $message,
                    'warning',
                    '/operations/cash-budgets',
                    'cash_budget',
                    $budget->id
                ));
            }
        }

        // ── STEP 2: Accounting approves ──────
        if ($request->has('status') && $request->status === 'approved') {
            $budget->update(['approved_by' => auth()->id()]);

            // Link to the Invoice
            $invoiceId = $budget->tripTicket?->jobOrder?->invoice_id;
            if ($invoiceId) {
                $invoice = \App\Models\Invoice::find($invoiceId);
                if ($invoice) {
                    $invoice->update(['cash_budget_request_id' => $budget->id]);
                }
            }

            // Optional: notify the preparer that it is approved and ready for disbursement
            if ($budget->preparedBy) {
                $reference = $budget->tripTicket?->control_no ?? ('CB-' . $budget->id);
                $budget->preparedBy->notify(new SystemAlert(
                    "Cash Budget Approved — {$reference}",
                    "Accounting has approved the cash budget. It is now ready for disbursement.",
                    'success',
                    '/operations/cash-budgets'
                ));
            }
        }

        // ── STEP 3: Cash budgets user disburses → create invoice in billing ─────────
        if ($request->has('status') && $request->status === 'disbursed') {
            // C-07: make the disbursement side effects atomic — the budget update, liquidation,
            // ledger entry, invoice and invoice items all persist together or roll back together.
            \Illuminate\Support\Facades\DB::transaction(function () use ($request, $budget) {
            $disbursedAmount = $request->input('disbursed_amount') ?? $budget->total_amount;
            $budget->update([
                'disbursed_by' => auth()->id(),
                'disbursed_amount' => $disbursedAmount
            ]);

            // Create pending liquidation
            $liquidationService = app(\App\Services\LiquidationService::class);
            if ($budget->tripTicket) {
                $liquidationService->createForTripTicket($budget->tripTicket, $disbursedAmount);
            }

            // Create double-entry journal entry in Ledger
            $ledgerService = app(\App\Services\LedgerService::class);
            $cashInBankAccount = \App\Models\Account::where('code', '1000')->first();
            
            if ($cashInBankAccount) {
                $debitAccount = null;
                $description = "";
                
                if ($budget->commission_id) {
                    $debitAccount = \App\Models\Account::where('code', '5400')->first(); // Commission Expense
                    $description = "Commission disbursement for " . ($budget->commission?->serial_no ?? "Commission #{$budget->commission_id}");
                } elseif ($budget->liquidation_id) {
                    $debitAccount = \App\Models\Account::where('code', '2100')->first(); // Due to Employees (clearing liability)
                    $description = "Liquidation reimbursement payout for DTT: " . ($budget->liquidation?->tripTicket?->control_no ?? "Liquidation #{$budget->liquidation_id}");
                } elseif ($budget->purchase_order_id || $budget->work_order_id) {
                    $debitAccount = \App\Models\Account::where('code', '5300')->first(); // Maintenance Expense
                    $description = "Maintenance budget disbursement for PO #" . ($budget->purchase_order_id ?? $budget->work_order_id);
                } elseif ($budget->tripTicket) {
                    $debitAccount = \App\Models\Account::where('code', '1200')->first(); // Employee Advances
                    $description = "Cash advance disbursed to driver for DTT: " . $budget->tripTicket->control_no;
                }
                
                if ($debitAccount) {
                    $ledgerService->recordEntry(
                        date('Y-m-d'),
                        $description,
                        [
                            [
                                'account_id' => $debitAccount->id,
                                'debit' => $disbursedAmount,
                                'credit' => 0,
                                'description' => $description
                            ],
                            [
                                'account_id' => $cashInBankAccount->id,
                                'debit' => 0,
                                'credit' => $disbursedAmount,
                                'description' => 'Disbursement from Cash in Bank'
                            ]
                        ],
                        $budget
                    );
                }
            }

            // Only create invoice if one doesn't already exist
            $existingInvoice = \App\Models\Invoice::where('cash_budget_request_id', $budget->id)->first();
            if (!$existingInvoice) {
                // Determine customer/payee label
                $customerName = 'Internal Expense';
                if ($budget->tripTicket) {
                    $driverName = $budget->tripTicket->driver
                        ? "{$budget->tripTicket->driver->first_name} {$budget->tripTicket->driver->last_name}"
                        : 'Driver';
                    $customerName = "DTT: {$budget->tripTicket->control_no} — {$driverName}";
                } elseif ($budget->purchase_order_id && $budget->purchaseOrder?->supplier) {
                    $customerName = $budget->purchaseOrder->supplier->company_name ?? $budget->purchaseOrder->supplier->name;
                }

                // Build invoice notes with destination/plate info
                $notesParts = ['Auto-generated from Cash Budget Request #' . $budget->id];
                if ($budget->destination) $notesParts[] = 'Destination: ' . $budget->destination;
                if ($budget->plate_number) $notesParts[] = 'Plate: ' . $budget->plate_number;
                if ($budget->travel_date) $notesParts[] = 'Travel Date: ' . $budget->travel_date->format('Y-m-d');

                // Use a timestamped invoice number for better traceability
                $invoiceNumber = 'INV-CB-' . date('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(4));

                $invoice = \App\Models\Invoice::create([
                    'invoice_number'         => $invoiceNumber,
                    'customer_name'          => $customerName,
                    'subtotal'               => $disbursedAmount,
                    'tax_amount'             => 0,
                    'total_amount'           => $disbursedAmount,
                    'amount_received'        => 0,
                    'change'                 => 0,
                    'payment_method'         => 'Cash',
                    'payment_type'           => 'full',
                    'balance'                => $disbursedAmount,
                    'status'                 => 'disbursed_budget',
                    'created_by'             => auth()->id() ?? 1,
                    'notes'                  => implode(' | ', $notesParts),
                    'cash_budget_request_id' => $budget->id,
                ]);

                if ($budget->purchase_order_id && $budget->purchaseOrder) {
                    foreach ($budget->purchaseOrder->lineItems as $poItem) {
                        $service = \App\Models\Service::firstOrCreate(
                            ['name' => $poItem->item_name],
                            [
                                'category'   => 'Procurement',
                                'price'      => 0,
                                'is_active'  => true,
                                'created_by' => auth()->id() ?? 1,
                            ]
                        );

                        \App\Models\InvoiceItem::create([
                            'invoice_id'  => $invoice->id,
                            'service_id'  => $service->id,
                            'quantity'    => $poItem->quantity,
                            'unit_price'  => $poItem->unit_price,
                            'total_price' => $poItem->total_price,
                        ]);
                    }
                } elseif ($budget->work_order_id && $budget->workOrder) {
                    $service = \App\Models\Service::firstOrCreate(
                        ['name' => 'Maintenance Work Order: ' . $budget->workOrder->wo_number],
                        [
                            'category'   => 'Procurement',
                            'price'      => 0,
                            'is_active'  => true,
                            'created_by' => auth()->id() ?? 1,
                        ]
                    );

                    \App\Models\InvoiceItem::create([
                        'invoice_id'  => $invoice->id,
                        'service_id'  => $service->id,
                        'quantity'    => 1,
                        'unit_price'  => $disbursedAmount,
                        'total_price' => $disbursedAmount,
                    ]);
                } else {
                    // Map each cash budget expense field to a human-readable label and create an invoice item per expense
                    $expenseFields = [
                        'diesel'               => 'Diesel',
                        'meal_allowance'       => 'Meal Allowance',
                        'sop'                  => 'SOP',
                        'autosweep'            => 'Autosweep',
                        'easytrip'             => 'Easytrip',
                        'coach_captain_salary' => 'Coach Captain Salary',
                        'spare_driver_salary'  => 'Spare Driver Salary',
                    ];

                    foreach ($expenseFields as $field => $label) {
                        $amount = (float) ($budget->$field ?? 0);
                        if ($amount <= 0) continue;

                        $service = \App\Models\Service::firstOrCreate(
                            ['name' => $label],
                            [
                                'category'   => 'Cash Budget',
                                'price'      => 0,
                                'is_active'  => true,
                                'created_by' => auth()->id() ?? 1,
                            ]
                        );

                        \App\Models\InvoiceItem::create([
                            'invoice_id'  => $invoice->id,
                            'service_id'  => $service->id,
                            'quantity'    => 1,
                            'unit_price'  => $amount,
                            'total_price' => $amount,
                        ]);
                    }
                }

                // Notify the preparer that the budget was disbursed
                if ($budget->preparedBy) {
                    $budget->preparedBy->notify(new SystemAlert(
                        "Cash Budget Disbursed — {$invoiceNumber}",
                        "Your cash budget request has been approved and disbursed. Requested: ₱" . number_format($budget->total_amount, 2) . ", Disbursed: ₱" . number_format($disbursedAmount, 2) . ". Invoice {$invoiceNumber} has been created in Billing.",
                        'success',
                        '/accounting/billing',
                        'cash_budget',
                        $budget->id
                    ));
                }
            }
            });
        }

        return $budget->load(['preparedBy', 'approvedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
    }

    public function destroy($id)
    {
        // C-05: restrict deletion to managers/accounting; block deletion of disbursed records
        // so financial history cannot be erased.
        $user = auth()->user();
        if (!$user || !$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager')) {
            return response()->json(['error' => 'Unauthorized to delete cash budget requests.'], 403);
        }

        $budget = CashBudgetRequest::findOrFail($id);
        if ($budget->status === 'disbursed') {
            return response()->json(['error' => 'Cannot delete a disbursed cash budget request.'], 422);
        }

        $budget->delete();
        return response()->json(['message' => 'Cash budget request deleted successfully.']);
    }
}
