<?php

namespace App\Services;

use App\Models\Account;
use App\Models\CashBudgetRequest;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JournalEntry;
use App\Models\Liquidation;
use App\Models\PurchaseOrder;
use App\Models\Service;
use App\Models\User;
use App\Models\WorkflowInstance;
use App\Models\WorkOrder;
use App\Notifications\ActionableApprovalNotification;
use App\Notifications\SystemAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CashBudgetRequestService
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = CashBudgetRequest::with(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);

        if (! $user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager')) {
            $query->where('prepared_by', $user->id);
        }

        return $query->latest()->paginate($request->per_page ?? 20);
    }

    public function store(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'date' => 'required|date',
            'travel_date' => 'nullable|date',
            'plate_number' => 'nullable|string',
            'destination' => 'nullable|string',
            'diesel' => 'nullable|numeric|min:0',
            'meal_allowance' => 'nullable|numeric|min:0',
            'sop' => 'nullable|numeric|min:0',
            'autosweep' => 'nullable|numeric|min:0',
            'easytrip' => 'nullable|numeric|min:0',
            'coach_captain_salary' => 'nullable|numeric|min:0',
            'spare_driver_salary' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            'trip_ticket_id' => 'nullable|exists:trip_tickets,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
        ]);

        $validated['prepared_by'] = auth()->id();

        if ($request->filled('purchase_order_id')) {
            $po = PurchaseOrder::find($request->purchase_order_id);
            $validated['total_amount'] = $po ? $po->total_amount : 0;
        } elseif ($request->filled('work_order_id')) {
            $wo = WorkOrder::find($request->work_order_id);
            $validated['total_amount'] = $wo ? ($wo->cost ?? 0) : 0;
        } elseif (array_key_exists('total_amount', $validated) && $validated['total_amount'] !== null) {
            // General requests may provide a direct validated amount.
            $validated['total_amount'] = (float) $validated['total_amount'];
        } else {
            // Driver Trip Ticket or default breakdown sum
            $validated['total_amount'] = collect($validated)->only([
                'diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary',
            ])->sum();
        }

        return DB::transaction(function () use ($validated) {
            $budget = CashBudgetRequest::create($validated);

            // Submit to workflow engine
            $wfService = app(WorkflowService::class);
            $wfInstance = $wfService->submit($budget, 'cash_budgets');

            if ($budget->status === 'pending_accounting' || $wfInstance->current_step === 1) {
                $budget->update(['status' => 'pending_accounting']);
            }

            return $budget->load(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
        });
    }

    public function show($id)
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice'])->findOrFail($id);
    }

    /**
     * Update an existing cash budget request.
     *
     * @param  mixed  $id
     * @return mixed
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user->hasRole('driver')) {
            return response()->json(['error' => 'Drivers cannot update cash budget requests.'], 403);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:draft,pending_accounting,approved,pending_super_admin,disbursed',
            'diesel' => 'sometimes|numeric|min:0',
            'meal_allowance' => 'sometimes|numeric|min:0',
            'sop' => 'sometimes|numeric|min:0',
            'autosweep' => 'sometimes|numeric|min:0',
            'easytrip' => 'sometimes|numeric|min:0',
            'coach_captain_salary' => 'sometimes|numeric|min:0',
            'spare_driver_salary' => 'sometimes|numeric|min:0',
            'total_amount' => 'sometimes|numeric|min:0',
            'purchase_order_id' => 'sometimes|nullable|exists:purchase_orders,id',
            'trip_ticket_id' => 'sometimes|nullable|exists:trip_tickets,id',
            'work_order_id' => 'sometimes|nullable|exists:work_orders,id',
            'disbursed_amount' => 'sometimes|numeric|min:0|nullable',
        ]);

        return DB::transaction(function () use ($id, $request, $user, $validated) {
            // Serialize state changes so two approvers cannot advance the same
            // request from the same state concurrently.
            $budget = CashBudgetRequest::with(['tripTicket', 'purchaseOrder.supplier', 'workOrder'])
                ->lockForUpdate()
                ->findOrFail($id);

            $previousStatus = $budget->status;
            $requestedStatus = $validated['status'] ?? null;

            if ($requestedStatus !== null) {
                $legalTransition = match ($previousStatus) {
                    'draft' => $requestedStatus === 'pending_accounting',
                    'pending_accounting' => $requestedStatus === 'approved',
                    'pending_super_admin' => $requestedStatus === 'approved',
                    'approved' => $requestedStatus === 'disbursed',
                    default => false,
                };

                if (! $legalTransition) {
                    return response()->json([
                        'error' => "Invalid cash budget transition from {$previousStatus} to {$requestedStatus}.",
                    ], 422);
                }

                $authorized = match ($previousStatus) {
                    // Existing operational roles may forward a draft; drivers
                    // remain explicitly blocked above.
                    'draft' => true,
                    'pending_accounting' => $user->hasRole('super_admin', 'accounting_executive'),
                    'pending_super_admin', 'approved' => $user->hasRole('super_admin', 'executive_vice_president'),
                    default => false,
                };

                if (! $authorized) {
                    return response()->json([
                        'error' => 'You are not authorized to perform this cash budget transition.',
                    ], 403);
                }
            }

            $protectedDraftFields = [
                'diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip',
                'coach_captain_salary', 'spare_driver_salary', 'total_amount',
                'purchase_order_id', 'trip_ticket_id', 'work_order_id',
            ];
            $hasProtectedDraftEdits = collect($protectedDraftFields)
                ->contains(fn ($field) => array_key_exists($field, $validated));

            if ($hasProtectedDraftEdits && $previousStatus !== 'draft') {
                return response()->json([
                    'error' => 'Cash budget amounts and accounting source are locked after submission for accounting review.',
                ], 422);
            }

            if ($hasProtectedDraftEdits && $budget->prepared_by !== $user->id && ! $user->hasRole('super_admin', 'executive_vice_president')) {
                return response()->json([
                    'error' => 'You are not authorized to edit another employee\'s cash budget amounts or accounting source.',
                ], 403);
            }

            if (array_key_exists('disbursed_amount', $validated)
                && ! ($previousStatus === 'approved' && $requestedStatus === 'disbursed'
                    && $user->hasRole('super_admin', 'executive_vice_president'))) {
                return response()->json([
                    'error' => 'The disbursed amount may only be set during authorized final disbursement.',
                ], 422);
            }

            // C-05: once disbursed, the financial fields are locked — no post-disbursement tampering.
            if ($budget->status === 'disbursed') {
                $lockedFields = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary', 'disbursed_amount', 'total_amount'];
                foreach ($lockedFields as $f) {
                    if ($request->has($f)) {
                        return response()->json([
                            'error' => 'Cannot modify amounts: this cash budget has already been disbursed.',
                        ], 422);
                    }
                }
            }

            // Recalculate total if any amounts updated and it's a DTT flow
            $amounts = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'];
            $needsRecalculation = collect($amounts)->contains(fn ($a) => $request->has($a));

            $wfInstance = null;
            if ($requestedStatus !== null) {
                $expectedStep = match ($previousStatus) {
                    'draft', 'pending_accounting' => 1,
                    'pending_super_admin' => 2,
                    'approved' => 3,
                };

                $wfInstance = $budget->workflowInstance()->lockForUpdate()->first();
                if ($wfInstance && ($wfInstance->status !== 'pending' || $wfInstance->current_step !== $expectedStep)) {
                    return response()->json([
                        'error' => 'The cash budget workflow is out of sync with its current status.',
                    ], 422);
                }

                if (! $wfInstance) {
                    $wfInstance = app(WorkflowService::class)->submit($budget, 'cash_budgets');
                    if ($expectedStep !== 1) {
                        $wfInstance->update(['current_step' => $expectedStep]);
                    }
                }
            }

            // Never persist the client-requested status directly. The transition
            // handlers below write the canonical state after all checks pass.
            $updates = $validated;
            unset($updates['status']);
            if ($updates !== []) {
                $budget->update($updates);
            }

            if ($needsRecalculation && ! $budget->purchase_order_id && ! $budget->work_order_id && $budget->trip_ticket_id) {
                $budget->update([
                    'total_amount' => collect($budget->only($amounts))->sum(),
                ]);
            }

            // ── STEP 1: Operations forwards to accounting → notify accounting via EMAIL + database ──────
            if ($requestedStatus === 'pending_accounting' && $previousStatus === 'draft') {
                $budget->update(['status' => 'pending_accounting']);
                // Notifications...
            }

            // ── STEP 2: Accounting approves → auto-forward to pending_super_admin → EMAIL super admin ──────
            if ($requestedStatus === 'approved' && $previousStatus === 'pending_accounting') {
                $this->recordWorkflowApproval($wfInstance, $user);
                $budget->update([
                    'approved_by' => auth()->id(),
                    'status' => 'pending_super_admin',
                ]);

                $reference = $budget->tripTicket?->control_no ?? ('CB-'.$budget->id);
                $totalAmount = number_format((float) ($budget->total_amount ?? 0), 2);
                $destination = $budget->destination ?? ($budget->tripTicket?->drop_off ?? 'N/A');
                $approverName = auth()->user()->first_name.' '.auth()->user()->last_name;

                $details = [
                    'Reference' => $reference,
                    'Destination' => $destination,
                    'Amount' => '₱'.$totalAmount,
                    'Verified By' => $approverName.' (Accounting)',
                    'Prepared By' => $budget->preparedBy ? ($budget->preparedBy->first_name.' '.$budget->preparedBy->last_name) : 'N/A',
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
                        'Accounting has approved the cash budget. It is now pending Super Admin approval.',
                        'info',
                        '/operations/cash-budgets'
                    ));
                }
            }

            // ── STEP 2b: Super Admin approves → ready for disbursement ──────
            if ($requestedStatus === 'approved' && $previousStatus === 'pending_super_admin') {
                $this->recordWorkflowApproval($wfInstance, $user);
                $budget->update([
                    'super_admin_approved_by' => auth()->id(),
                    'status' => 'approved',
                ]);
            }

            // ── STEP 3: Super Admin / EVP disburses → create invoice in billing ─────────
            if ($requestedStatus === 'disbursed' && $previousStatus === 'approved') {
                $this->recordWorkflowApproval($wfInstance, $user);
                $budget->update(['super_admin_approved_by' => auth()->id()]);
                // C-07: make the disbursement side effects atomic — the budget update, liquidation,
                // ledger entry, invoice and invoice items all persist together or roll back together.
                $disbursedAmount = (float) ($request->input('disbursed_amount') ?? $budget->total_amount);
                $oldTotalAmount = (float) $budget->total_amount;

                if ($disbursedAmount > $oldTotalAmount * 1.1) {
                    throw new \InvalidArgumentException('Disbursed amount (₱'.number_format($disbursedAmount, 2).') cannot exceed 110% of the approved total (₱'.number_format($oldTotalAmount, 2).').');
                }

                // Post the authorized amount once so liquidation, ledger, and
                // invoice all share the same disbursement truth.
                $this->initializeLiquidationAndLedger($budget, $disbursedAmount);

                $budget->update([
                    'status' => 'disbursed',
                    'disbursed_by' => auth()->id(),
                    'disbursed_amount' => $disbursedAmount,
                ]);

                // Only create invoice if one doesn't already exist
                $existingInvoice = Invoice::where('cash_budget_request_id', $budget->id)->first();
                if (! $existingInvoice) {
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
                    $notesParts = ['Auto-generated from Cash Budget Request #'.$budget->id];
                    if ($budget->destination) {
                        $notesParts[] = 'Destination: '.$budget->destination;
                    }
                    if ($budget->plate_number) {
                        $notesParts[] = 'Plate: '.$budget->plate_number;
                    }
                    if ($budget->travel_date) {
                        $travelDateStr = $budget->travel_date instanceof \DateTimeInterface ? $budget->travel_date->format('Y-m-d') : (string) $budget->travel_date;
                        $notesParts[] = 'Travel Date: '.$travelDateStr;
                    }

                    // Use a timestamped invoice number for better traceability
                    $invoiceNumber = 'INV-CB-'.date('Ymd').'-'.strtoupper(Str::random(4));

                    $invoice = Invoice::create([
                        'invoice_number' => $invoiceNumber,
                        'customer_name' => $customerName,
                        'subtotal' => $disbursedAmount,
                        'tax_amount' => 0,
                        'total_amount' => $disbursedAmount,
                        'amount_received' => 0,
                        'change' => 0,
                        'payment_method' => 'Cash',
                        'payment_type' => 'full',
                        'balance' => $disbursedAmount,
                        'status' => 'disbursed_budget',
                        'created_by' => auth()->id() ?? 1,
                        'notes' => implode(' | ', $notesParts),
                        'cash_budget_request_id' => $budget->id,
                    ]);

                    if ($budget->purchase_order_id && $budget->purchaseOrder) {
                        foreach ($budget->purchaseOrder->lineItems as $poItem) {
                            $service = Service::firstOrCreate(
                                ['name' => $poItem->item_name],
                                [
                                    'category' => 'Procurement',
                                    'price' => 0,
                                    'is_active' => true,
                                    'created_by' => auth()->id() ?? 1,
                                ]
                            );

                            InvoiceItem::create([
                                'invoice_id' => $invoice->id,
                                'service_id' => $service->id,
                                'quantity' => $poItem->quantity,
                                'unit_price' => $poItem->unit_price,
                                'total_price' => $poItem->total_price,
                            ]);
                        }
                    } elseif ($budget->work_order_id && $budget->workOrder) {
                        $service = Service::firstOrCreate(
                            ['name' => 'Maintenance Work Order: '.$budget->workOrder->wo_number],
                            [
                                'category' => 'Procurement',
                                'price' => 0,
                                'is_active' => true,
                                'created_by' => auth()->id() ?? 1,
                            ]
                        );

                        InvoiceItem::create([
                            'invoice_id' => $invoice->id,
                            'service_id' => $service->id,
                            'quantity' => 1,
                            'unit_price' => $disbursedAmount,
                            'total_price' => $disbursedAmount,
                        ]);
                    } else {
                        // Map each cash budget expense field to a human-readable label and create an invoice item per expense
                        $expenseFields = [
                            'diesel' => 'Diesel',
                            'meal_allowance' => 'Meal Allowance',
                            'sop' => 'SOP',
                            'autosweep' => 'Autosweep',
                            'easytrip' => 'Easytrip',
                            'coach_captain_salary' => 'Coach Captain Salary',
                            'spare_driver_salary' => 'Spare Driver Salary',
                        ];

                        foreach ($expenseFields as $field => $label) {
                            $amount = (float) ($budget->$field ?? 0);
                            if ($amount <= 0) {
                                continue;
                            }

                            $service = Service::firstOrCreate(
                                ['name' => $label],
                                [
                                    'category' => 'Cash Budget',
                                    'price' => 0,
                                    'is_active' => true,
                                    'created_by' => auth()->id() ?? 1,
                                ]
                            );

                            InvoiceItem::create([
                                'invoice_id' => $invoice->id,
                                'service_id' => $service->id,
                                'quantity' => 1,
                                'unit_price' => $amount,
                                'total_price' => $amount,
                            ]);
                        }
                    }

                    // The invoice is the immutable disbursement document. Preserve
                    // the approved source breakdown, then add one explicit variance
                    // row whenever the cash actually released differs from that
                    // breakdown so item totals always reconcile to the header.
                    $itemTotal = (float) $invoice->items()->sum('total_price');
                    $variance = round($disbursedAmount - $itemTotal, 2);
                    if (abs($variance) >= 0.01) {
                        $varianceService = Service::firstOrCreate(
                            ['name' => 'Cash Disbursement Variance'],
                            [
                                'category' => 'Cash Budget',
                                'price' => 0,
                                'is_active' => true,
                                'created_by' => auth()->id() ?? 1,
                            ]
                        );

                        InvoiceItem::create([
                            'invoice_id' => $invoice->id,
                            'service_id' => $varianceService->id,
                            'item_name' => $variance > 0
                                ? 'Additional cash disbursed'
                                : 'Cash retained / amount not released',
                            'quantity' => 1,
                            'unit_price' => $variance,
                            'total_price' => $variance,
                        ]);
                    }

                    // Notify the preparer that the budget was disbursed
                    if ($budget->preparedBy) {
                        $budget->preparedBy->notify(new SystemAlert(
                            "Cash Budget Disbursed — {$invoiceNumber}",
                            'Your cash budget request has been approved and disbursed. Requested: ₱'.number_format((float) ($budget->total_amount ?? 0), 2).', Disbursed: ₱'.number_format((float) ($disbursedAmount ?? 0), 2).". Invoice {$invoiceNumber} has been created in Billing.",
                            'success',
                            '/accounting/billing',
                            'cash_budget',
                            $budget->id
                        ));
                    }
                }
            }

            return $budget->load(['preparedBy', 'approvedBy', 'superAdminApprovedBy', 'disbursedBy', 'purchaseOrder.lineItems', 'tripTicket.driver', 'tripTicket.bus', 'workOrder', 'invoice']);
        });
    }

    /**
     * Record and advance an already-authorized cash-budget workflow step.
     *
     * The service state machine is the authorization source for these steps;
     * this keeps the persisted workflow trail aligned with the API transition
     * even when legacy workflow definitions contain stale role assignments.
     */
    private function recordWorkflowApproval(WorkflowInstance $instance, User $user): void
    {
        $currentStep = $instance->current_step;

        $instance->actions()->create([
            'step' => $currentStep,
            'user_id' => $user->id,
            'decision' => 'approved',
            'acted_at' => now(),
        ]);

        $nextStep = $instance->definition->steps()
            ->where('order', '>', $currentStep)
            ->orderBy('order')
            ->first();

        if ($nextStep) {
            $instance->update(['current_step' => $nextStep->order]);

            return;
        }

        $instance->update(['status' => 'completed']);
    }

    private function initializeLiquidationAndLedger(CashBudgetRequest $budget, float $disbursedAmount)
    {
        // Determine the source type BEFORE creating the liquidation (liquidation_id
        // will always be truthy after creation, so checking it later shadows PO/WO/payroll).
        $sourceType = $this->determineBudgetSourceType($budget);

        // 1. Create pending liquidation if not already exists
        if (! $budget->liquidation_id) {
            $employeeId = $budget->tripTicket?->driver_id ?? $budget->prepared_by ?? auth()->id() ?? 1;

            $liquidation = Liquidation::create([
                'trip_ticket_id' => $budget->trip_ticket_id,
                'work_order_id' => $budget->work_order_id,
                'purchase_order_id' => $budget->purchase_order_id,
                'payroll_cycle_id' => $budget->payroll_cycle_id,
                'employee_id' => $employeeId,
                'source_type' => $sourceType,
                'status' => 'pending',
                'total_advanced' => $disbursedAmount,
            ]);

            $budget->update(['liquidation_id' => $liquidation->id]);
            $budget->refresh();
        }

        // 2. Create double-entry journal entry in Ledger if not already exists
        $exists = JournalEntry::where('reference_type', 'App\Models\CashBudgetRequest')
            ->where('reference_id', $budget->id)
            ->exists();

        if (! $exists) {
            $ledgerService = app(LedgerService::class);
            $cashInBankAccount = Account::where('code', '1000')->first();

            if ($cashInBankAccount) {
                [$debitAccount, $description] = $this->resolveDebitAccountAndDescription($budget, $sourceType);

                if ($debitAccount) {
                    $ledgerService->recordEntry(
                        date('Y-m-d'),
                        $description,
                        [
                            [
                                'account_id' => $debitAccount->id,
                                'debit' => $disbursedAmount,
                                'credit' => 0,
                                'description' => $description,
                            ],
                            [
                                'account_id' => $cashInBankAccount->id,
                                'debit' => 0,
                                'credit' => $disbursedAmount,
                                'description' => 'Disbursement from Cash in Bank',
                            ],
                        ],
                        $budget
                    );
                }
            }
        }
    }

    private function determineBudgetSourceType(CashBudgetRequest $budget): string
    {
        if ($budget->commission_id) {
            return 'commission';
        }
        if ($budget->purchase_order_id || $budget->work_order_id) {
            return 'maintenance';
        }
        if ($budget->payroll_cycle_id) {
            return 'payroll';
        }
        if ($budget->trip_ticket_id || $budget->tripTicket) {
            return 'dtt';
        }

        return 'general';
    }

    private function resolveDebitAccountAndDescription(CashBudgetRequest $budget, string $sourceType): array
    {
        return match ($sourceType) {
            'commission' => [
                Account::where('code', '5400')->first(),
                'Commission disbursement for '.($budget->commission?->serial_no ?? "Commission #{$budget->commission_id}"),
            ],
            'maintenance' => [
                Account::where('code', '5300')->first(),
                'Maintenance budget request for '.($budget->purchase_order_id ? "PO #{$budget->purchase_order_id}" : "WO #{$budget->work_order_id}"),
            ],
            'payroll' => [
                Account::where('code', '6000')->first(),
                "Payroll request for cycle #{$budget->payroll_cycle_id}",
            ],
            'dtt' => [
                Account::where('code', '1200')->first(),
                'Cash advance request for DTT: '.($budget->tripTicket?->control_no ?? "CB-{$budget->id}"),
            ],
            default => [
                Account::where('code', '1200')->first(),
                'Cash budget request: '.($budget->destination ?? "CB-{$budget->id}"),
            ],
        };
    }

    public function destroy($id)
    {
        $user = auth()->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthorized to delete cash budget requests.'], 403);
        }

        return DB::transaction(function () use ($id, $user) {
            $budget = CashBudgetRequest::lockForUpdate()->findOrFail($id);

            if ($budget->status !== 'draft') {
                return response()->json([
                    'error' => 'Only draft cash budget requests may be deleted. Submitted workflow and financial history must be retained.',
                ], 422);
            }

            if ($budget->prepared_by !== $user->id && ! $user->hasRole('super_admin', 'executive_vice_president')) {
                return response()->json(['error' => 'Unauthorized to delete this cash budget request.'], 403);
            }

            $budget->delete();

            return response()->json(['message' => 'Cash budget request deleted successfully.']);
        });
    }
}
