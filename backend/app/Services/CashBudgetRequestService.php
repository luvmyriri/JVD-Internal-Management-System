<?php

namespace App\Services;

use App\Models\CashBudgetRequest;
use App\Models\User;
use App\Notifications\SystemAlert;
use App\Notifications\ActionableApprovalNotification;
use Illuminate\Http\Request;

class CashBudgetRequestService
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = CashBudgetRequest::with(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);

        if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager')) {
            $query->where('prepared_by', $user->id);
        }

        return $query->latest()->paginate($request->per_page ?? 20);
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

        // Submit to workflow engine
        $wfService = app(\App\Services\WorkflowService::class);
        $wfInstance = $wfService->submit($budget, 'cash_budgets');

        if ($budget->status === 'pending_accounting' || $wfInstance->current_step === 1) {
            $budget->update(['status' => 'pending_accounting']);
            $this->initializeLiquidationAndLedger($budget);
        }

        return $budget->load(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
    }

    public function show($id)
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice'])->findOrFail($id);
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
            if ($newStatus === 'pending_super_admin') {
                if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive')) {
                    return response()->json(['error' => 'Unauthorized to forward cash budget requests for super admin approval.'], 403);
                }
            }
            if ($newStatus === 'disbursed') {
                if (!$user->hasRole('super_admin', 'executive_vice_president')) {
                    return response()->json(['error' => 'Only Super Admin or Executive Vice President can approve disbursement.'], 403);
                }
            }
        }

        $budget = CashBudgetRequest::with(['tripTicket', 'purchaseOrder.supplier', 'workOrder'])->findOrFail($id);

        $validated = $request->validate([
            'status'               => 'sometimes|in:draft,pending_accounting,approved,pending_super_admin,disbursed',
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

        $previousStatus = $budget->status;

        // Recalculate total if any amounts updated and it's a DTT flow
        $amounts = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'];
        $needsRecalculation = collect($amounts)->contains(fn($a) => $request->has($a));

        // Create or get workflow instance
        $wfService = app(\App\Services\WorkflowService::class);
        $wfInstance = $budget->workflowInstance ?? tap($wfService->submit($budget, 'cash_budgets'), function ($inst) use ($budget) {
            // Fast-forward legacy stuck instances
            if ($budget->status === 'pending_super_admin') $inst->update(['current_step' => 2]);
            if ($budget->status === 'approved') $inst->update(['current_step' => 3]);
            if ($budget->status === 'disbursed') $inst->update(['status' => 'completed']);
        });

        $budget->update($validated);

        if ($needsRecalculation && !$budget->purchase_order_id && !$budget->work_order_id && $budget->trip_ticket_id) {
            $budget->update([
                'total_amount' => collect($budget->only($amounts))->sum()
            ]);
        }

        // ── STEP 1: Operations forwards to accounting → notify accounting via EMAIL + database ──────
        if ($request->has('status') && $request->status === 'pending_accounting' && $previousStatus === 'draft') {
            $this->initializeLiquidationAndLedger($budget);
            // Notifications...
        }

        // ── STEP 2: Accounting approves → auto-forward to pending_super_admin → EMAIL super admin ──────
        if ($request->has('status') && $request->status === 'approved' && $previousStatus === 'pending_accounting') {
            $wfService->approve($wfInstance, $user);
            $budget->update([
                'approved_by' => auth()->id(),
                'status'      => 'pending_super_admin',
            ]);

            $reference   = $budget->tripTicket?->control_no ?? ('CB-' . $budget->id);
            $totalAmount = number_format($budget->total_amount, 2);
            $destination = $budget->destination ?? ($budget->tripTicket?->drop_off ?? 'N/A');
            $approverName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

            $details = [
                'Reference'    => $reference,
                'Destination'  => $destination,
                'Amount'       => '₱' . $totalAmount,
                'Verified By'  => $approverName . ' (Accounting)',
                'Prepared By'  => $budget->preparedBy ? ($budget->preparedBy->first_name . ' ' . $budget->preparedBy->last_name) : 'N/A',
            ];

            $superAdminUsers = User::whereIn('role', ['super_admin', 'executive_vice_president'])
                ->where('is_active', true)
                ->get();

            foreach ($superAdminUsers as $saUser) {
                $saUser->notify(new ActionableApprovalNotification(
                    "Cash Budget Pending Final Approval — {$reference}",
                    "Accounting has verified a cash budget of ₱{$totalAmount} for {$destination}. Your final approval is required before disbursement.",
                    'cash_budget',
                    $budget->id,
                    $details
                ));
            }

            if ($budget->preparedBy) {
                $budget->preparedBy->notify(new SystemAlert(
                    "Cash Budget Approved by Accounting — {$reference}",
                    "Accounting has approved the cash budget. It is now pending Super Admin approval.",
                    'info',
                    '/operations/cash-budgets'
                ));
            }
        }

        // ── STEP 2b: Super Admin approves → ready for disbursement ──────
        if ($request->has('status') && $request->status === 'approved' && $previousStatus === 'pending_super_admin') {
            $wfService->approve($wfInstance, $user);
            $budget->update([
                'super_admin_approved_by' => auth()->id(),
                'status'                  => 'approved',
            ]);
        }

        // ── STEP 3: Super Admin / EVP disburses → create invoice in billing ─────────
        if ($request->has('status') && $request->status === 'disbursed') {
            if ($previousStatus !== 'approved') {
                return response()->json([
                    'error' => 'Cash budget must be approved by both accounting and super admin before disbursement.'
                ], 422);
            }

            $wfService->approve($wfInstance, $user);
            $budget->update(['super_admin_approved_by' => auth()->id()]);
            // C-07: make the disbursement side effects atomic — the budget update, liquidation,
            // ledger entry, invoice and invoice items all persist together or roll back together.
            \Illuminate\Support\Facades\DB::transaction(function () use ($request, $budget) {
            $disbursedAmount = (float) ($request->input('disbursed_amount') ?? $budget->total_amount);
            $oldTotalAmount = (float) $budget->total_amount;

            if ($disbursedAmount > $oldTotalAmount * 1.1) {
                throw new \InvalidArgumentException("Disbursed amount (₱" . number_format($disbursedAmount, 2) . ") cannot exceed 110% of the approved total (₱" . number_format($oldTotalAmount, 2) . ").");
            }

            // Ensure Liquidation and initial Ledger are created (handles direct approved requests)
            $this->initializeLiquidationAndLedger($budget);

            $budget->update([
                'disbursed_by' => auth()->id(),
                'disbursed_amount' => $disbursedAmount
            ]);

            // Adjust the Liquidation's total_advanced if it exists
            if ($budget->liquidation) {
                $budget->liquidation->update(['total_advanced' => $disbursedAmount]);
            }

            $diff = (float) $disbursedAmount - $oldTotalAmount;
            if ($diff !== 0.0) {
                $ledgerService = app(\App\Services\LedgerService::class);
                $cashInBankAccount = \App\Models\Account::where('code', '1000')->first();

                if (!$cashInBankAccount) {
                    \Log::warning("Ledger entry skipped for CashBudgetRequest #{$budget->id}: Cash in Bank account (1000) not found.");
                }

                if ($cashInBankAccount) {
                    $debitAccount = null;
                    $description = "Adjustment for cash budget disbursement difference (Budget #{$budget->id})";

                    if ($budget->commission_id) {
                        $debitAccount = \App\Models\Account::where('code', '5400')->first();
                    } elseif ($budget->payroll_cycle_id) {
                        $debitAccount = \App\Models\Account::where('code', '6000')->first();
                    } elseif ($budget->purchase_order_id || $budget->work_order_id) {
                        $debitAccount = \App\Models\Account::where('code', '5300')->first();
                    } else {
                        $debitAccount = \App\Models\Account::where('code', '1200')->first();
                    }

                    if (!$debitAccount) {
                        \Log::warning("Ledger entry skipped for CashBudgetRequest #{$budget->id}: debit account not found in chart of accounts.");
                    }

                    if ($debitAccount) {
                        if ($diff > 0) {
                            $ledgerEntries = [
                                [
                                    'account_id' => $debitAccount->id,
                                    'debit' => $diff,
                                    'credit' => 0,
                                    'description' => "Increase budget disbursement adjustment"
                                ],
                                [
                                    'account_id' => $cashInBankAccount->id,
                                    'debit' => 0,
                                    'credit' => $diff,
                                    'description' => "Decrease cash adjustment"
                                ]
                            ];
                        } else {
                            $absDiff = abs($diff);
                            $ledgerEntries = [
                                [
                                    'account_id' => $cashInBankAccount->id,
                                    'debit' => $absDiff,
                                    'credit' => 0,
                                    'description' => "Increase cash adjustment (reduced disbursement)"
                                ],
                                [
                                    'account_id' => $debitAccount->id,
                                    'debit' => 0,
                                    'credit' => $absDiff,
                                    'description' => "Decrease budget disbursement adjustment"
                                ]
                            ];
                        }
                        
                        $ledgerService->recordEntry(
                            date('Y-m-d'),
                            $description,
                            $ledgerEntries,
                            $budget
                        );
                    }
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

        return $budget->load(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
    }

    private function initializeLiquidationAndLedger(CashBudgetRequest $budget)
    {
        // Determine the source type BEFORE creating the liquidation (liquidation_id
        // will always be truthy after creation, so checking it later shadows PO/WO/payroll).
        $sourceType = $this->determineBudgetSourceType($budget);

        // 1. Create pending liquidation if not already exists
        if (!$budget->liquidation_id) {
            $employeeId = $budget->tripTicket?->driver_id ?? $budget->prepared_by ?? auth()->id() ?? 1;

            $liquidation = \App\Models\Liquidation::create([
                'trip_ticket_id'     => $budget->trip_ticket_id,
                'work_order_id'      => $budget->work_order_id,
                'purchase_order_id'  => $budget->purchase_order_id,
                'payroll_cycle_id'   => $budget->payroll_cycle_id,
                'employee_id'        => $employeeId,
                'source_type'        => $sourceType,
                'status'             => 'pending',
                'total_advanced'     => $budget->total_amount,
            ]);

            $budget->update(['liquidation_id' => $liquidation->id]);
            $budget->refresh();
        }

        // 2. Create double-entry journal entry in Ledger if not already exists
        $exists = \App\Models\JournalEntry::where('reference_type', 'App\Models\CashBudgetRequest')
            ->where('reference_id', $budget->id)
            ->exists();

        if (!$exists) {
            $ledgerService = app(\App\Services\LedgerService::class);
            $cashInBankAccount = \App\Models\Account::where('code', '1000')->first();

            if ($cashInBankAccount) {
                [$debitAccount, $description] = $this->resolveDebitAccountAndDescription($budget, $sourceType);

                if ($debitAccount) {
                    $ledgerService->recordEntry(
                        date('Y-m-d'),
                        $description,
                        [
                            [
                                'account_id' => $debitAccount->id,
                                'debit' => $budget->total_amount,
                                'credit' => 0,
                                'description' => $description
                            ],
                            [
                                'account_id' => $cashInBankAccount->id,
                                'debit' => 0,
                                'credit' => $budget->total_amount,
                                'description' => 'Disbursement from Cash in Bank'
                            ]
                        ],
                        $budget
                    );
                }
            }
        }
    }

    private function determineBudgetSourceType(CashBudgetRequest $budget): string
    {
        if ($budget->commission_id) return 'commission';
        if ($budget->purchase_order_id || $budget->work_order_id) return 'maintenance';
        if ($budget->payroll_cycle_id) return 'payroll';
        if ($budget->trip_ticket_id || $budget->tripTicket) return 'dtt';
        return 'general';
    }

    private function resolveDebitAccountAndDescription(CashBudgetRequest $budget, string $sourceType): array
    {
        return match ($sourceType) {
            'commission' => [
                \App\Models\Account::where('code', '5400')->first(),
                "Commission disbursement for " . ($budget->commission?->serial_no ?? "Commission #{$budget->commission_id}"),
            ],
            'maintenance' => [
                \App\Models\Account::where('code', '5300')->first(),
                "Maintenance budget request for " . ($budget->purchase_order_id ? "PO #{$budget->purchase_order_id}" : "WO #{$budget->work_order_id}"),
            ],
            'payroll' => [
                \App\Models\Account::where('code', '6000')->first(),
                "Payroll request for cycle #{$budget->payroll_cycle_id}",
            ],
            'dtt' => [
                \App\Models\Account::where('code', '1200')->first(),
                "Cash advance request for DTT: " . ($budget->tripTicket?->control_no ?? "CB-{$budget->id}"),
            ],
            default => [
                \App\Models\Account::where('code', '1200')->first(),
                "Cash budget request: " . ($budget->destination ?? "CB-{$budget->id}"),
            ],
        };
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
