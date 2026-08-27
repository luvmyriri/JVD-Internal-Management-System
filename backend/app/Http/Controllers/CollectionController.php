<?php

namespace App\Http\Controllers;

use App\Jobs\SendInvoiceDocumentsJob;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Invoice;
use App\Services\AuditLogService;
use App\Services\InvoiceDocumentMailService;
use App\Services\SalesLifecycleService;
use App\Services\SalesOrderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $query = Collection::with([
            'payments',
            'invoice.items.service',
            'invoice.salesOrder.adjustments',
            'invoice.salesOrder.creditNotes.refunds',
            'invoice.salesOrder.refunds',
            'customer',
        ]);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%$search%")
                    ->orWhere('service_type', 'like', "%$search%")
                    ->orWhereHas('invoice', function ($iq) use ($search) {
                        $iq->where('invoice_number', 'like', "%$search%");
                    });
            });
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('collection_status', $request->status);
        } elseif (! $request->filled('search') && $request->status !== 'all') {
            // Hide fully-settled records only on default listing without a search query
            $query->where('remaining_balance', '>', 0);
        }

        // Filter by created date range (inclusive) for the shared timeframe filter.
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $collections = $query->latest()->get();

        $stats = [
            'pending' => Collection::where('collection_status', 'pending')->count(),
            'partial' => Collection::where('collection_status', 'partial')->count(),
            'overdue' => Collection::where('collection_status', 'overdue')->count(),
            'completed' => Collection::where('collection_status', 'completed')
                ->whereMonth('updated_at', date('m'))
                ->whereYear('updated_at', date('Y'))
                ->count(),
        ];

        return response()->json([
            'data' => $collections,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => 'required|string',
            'service_type' => 'nullable|string',
            'other_service_type' => 'nullable|string',
            'date' => 'required|date',
            'travel_date' => 'required|date',
            'pick_up' => 'nullable|string',
            'drop_off' => 'nullable|string',
            'rate' => 'nullable|numeric|min:0.01',
            'customer_id' => 'nullable|exists:customers,id',
            // Payment evidence must go through addPayment(), where collection
            // locking, idempotency, terminal-state, and balance checks apply.
            'payments' => 'prohibited',
        ]);

        return DB::transaction(function () use ($validated) {
            $collectionData = collect($validated)->except('payments')->toArray();

            // Set default billing fields for manual collections so recalculate works perfectly!
            $collectionData['billing_amount'] = $validated['rate'] ?? 0;
            $collectionData['remaining_balance'] = $validated['rate'] ?? 0;
            $collectionData['due_date'] = $validated['travel_date'] ?? null;
            $collectionData['collection_status'] = 'pending';

            $collection = Collection::create($collectionData);

            // Recalculate will populate paid_amount, remaining_balance, and status!
            $collection->recalculate();

            AuditLogService::log('create', 'accounting', 'Collection', $collection->id, null, $collection->toArray());

            return $collection->load('payments');
        });
    }

    public function show($id)
    {
        return Collection::with('payments')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        $validated = $request->validate([
            'client_name' => 'sometimes|string',
            'service_type' => 'sometimes|nullable|string',
            'other_service_type' => 'sometimes|nullable|string',
            'date' => 'sometimes|date',
            'travel_date' => 'sometimes|date',
            'pick_up' => 'sometimes|string',
            'drop_off' => 'sometimes|string',
            'rate' => 'prohibited',
            'payments' => 'prohibited',
        ]);

        return DB::transaction(function () use ($collection, $validated) {
            $oldValues = $collection->toArray();
            $collection->update($validated);

            // Payment rows post journal entries when created. They are append-only and
            // can only be added through addPayment(), never replaced by a metadata edit.
            $collection->recalculate();
            AuditLogService::log(
                'update',
                'accounting',
                'Collection',
                $collection->id,
                $oldValues,
                $collection->fresh()->toArray()
            );

            if ($collection->invoice_id) {
                $invoice = $collection->invoice;
                $notificationEmail = $invoice?->notificationEmail();
                if ($invoice && $notificationEmail) {
                    try {
                        SendInvoiceDocumentsJob::dispatch($invoice->id)->afterResponse();
                    } catch (\Exception $mailEx) {
                        \Log::error("Failed to send updated collection email to {$notificationEmail}: ".$mailEx->getMessage());
                    }
                }
            }

            return $collection->load('payments');
        });
    }

    public function destroy($id)
    {
        $collection = Collection::findOrFail($id);
        if ($collection->invoice_id || $collection->auto_generated || $collection->payments()->exists()) {
            return response()->json([
                'message' => 'Posted or paid collections cannot be deleted. Use the controlled cancellation and refund workflow.',
            ], 422);
        }
        AuditLogService::log('delete', 'accounting', 'Collection', $collection->id, $collection->toArray(), null);
        $collection->delete();

        return response()->json(['message' => 'Collection deleted successfully.']);
    }

    public function confirm($id)
    {
        $collection = Collection::findOrFail($id);

        return response()->json([
            'message' => 'Direct confirmation is disabled because it has no payment evidence. Record the actual payment method and amount instead.',
            'data' => $collection->load('payments'),
        ], 409);
    }

    public function addPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'idempotency_key' => 'sometimes|nullable|string|max:255',
        ]);

        // Resolve the immutable invoice association before entering the critical
        // section so every payment path acquires locks in one order:
        // Invoice -> Collection -> existing payment evidence.
        $invoiceId = Collection::query()->whereKey($id)->value('invoice_id');

        $result = DB::transaction(function () use ($id, $invoiceId, $validated) {
            $invoice = $invoiceId ? Invoice::lockForUpdate()->findOrFail($invoiceId) : null;
            $collection = Collection::lockForUpdate()->findOrFail($id);

            if ((int) ($collection->invoice_id ?? 0) !== (int) ($invoice?->id ?? 0)) {
                throw ValidationException::withMessages([
                    'payment' => ['The collection invoice association changed. Reload and retry the payment.'],
                ]);
            }

            if ($invoice && in_array($invoice->status, ['cancelled', 'voided', 'disbursed_budget'], true)) {
                throw ValidationException::withMessages([
                    'payment' => ['Payments cannot be posted to a cancelled, voided, or internal disbursement invoice.'],
                ]);
            }

            $paymentEvidence = $collection->payments()->lockForUpdate()->get();

            if (! empty($validated['idempotency_key'])) {
                $existing = $paymentEvidence->firstWhere('idempotency_key', $validated['idempotency_key'])
                    ?? CollectionPayment::where('idempotency_key', $validated['idempotency_key'])->lockForUpdate()->first();
                if ($existing) {
                    if ((int) $existing->collection_id !== (int) $collection->id) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => ['This idempotency key was already used for a different collection.'],
                        ]);
                    }

                    return ['collection' => $collection->load('payments'), 'duplicate' => true];
                }
            }

            // Calculate truth from posted rows while holding the collection lock;
            // stale remaining_balance values can never authorize an overpayment.
            $billingAmount = $invoice
                ? (float) $invoice->total_amount
                : (float) ($collection->billing_amount ?: $collection->rate ?: 0);
            $postedAmount = (float) $paymentEvidence->sum('amount');
            $remainingCents = max(0, (int) round($billingAmount * 100) - (int) round($postedAmount * 100));
            $remaining = $remainingCents / 100;

            if ($remaining <= 0 || $collection->collection_status === 'completed') {
                throw ValidationException::withMessages([
                    'payment' => ['This collection is already fully settled. No further payments can be recorded.'],
                ]);
            }

            $paymentCents = (int) round((float) $validated['amount'] * 100);
            if ($paymentCents > $remainingCents) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount cannot exceed the remaining balance of ₱'.number_format($remaining, 2).'.'],
                ]);
            }

            $collection->payments()->create($validated);
            $collection->recalculate();

            return ['collection' => $collection->fresh()->load(['payments', 'invoice']), 'duplicate' => false];
        });

        $collection = $result['collection'];

        if (! $result['duplicate'] && $collection->invoice_id) {
            $invoice = $collection->invoice;
            $notificationEmail = $invoice?->notificationEmail();
            if ($invoice && $notificationEmail) {
                try {
                    SendInvoiceDocumentsJob::dispatch($invoice->id)->afterResponse();
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send updated payment receipt email on addPayment to {$notificationEmail}: ".$mailEx->getMessage());
                }
            }
        }

        return response()->json([
            'message' => $result['duplicate'] ? 'Payment already recorded.' : 'Payment added successfully.',
            'data' => $collection->load('payments'),
        ]);
    }

    public function updateRemarks(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        $validated = $request->validate([
            'remarks' => 'nullable|string',
        ]);

        $collection->update(['remarks' => $validated['remarks']]);

        return response()->json([
            'message' => 'Remarks updated.',
            'data' => $collection,
        ]);
    }

    /**
     * Process an online (PayMongo) or offline (Cash/Bank) refund.
     */
    public function processRefund(Request $request, $id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Direct refunds are disabled. Submit cancellation, approve its credit note, then request, approve, and process the refund through the controlled workflow.',
        ], 409);
    }

    public function sendSoaNotification($id, InvoiceDocumentMailService $mail)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);

        $email = null;
        if ($collection->invoice && $collection->invoice->notificationEmail()) {
            $email = $collection->invoice->notificationEmail();
        } elseif ($collection->customer && $collection->customer->email) {
            $email = $collection->customer->email;
        }

        if (! $email) {
            return response()->json([
                'success' => false,
                'message' => 'No valid customer email address found for this collection.',
            ], 400);
        }

        $pdfData = $this->buildSoaInvoice($collection);
        $invoice = $pdfData['invoice'];

        try {
            @set_time_limit(120);
            $mail->send($invoice, $email);

            return response()->json([
                'success' => true,
                'message' => 'Statement of Account notification email sent to '.$email,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send email: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build a unified invoice-like object for the SOA PDF.
     * Works for both invoice-linked and standalone collections.
     */
    private function buildSoaInvoice(Collection $collection): array
    {
        $collection->loadMissing(['invoice', 'customer', 'payments']);
        $collection->invoice?->loadMissing(Invoice::operationalDocumentRelations());

        $email = null;
        if ($collection->invoice && $collection->invoice->notificationEmail()) {
            $email = $collection->invoice->notificationEmail();
        } elseif ($collection->customer && $collection->customer->email) {
            $email = $collection->customer->email;
        }

        if ($collection->invoice) {
            $invoice = $collection->invoice;
            // Always attach the payment history from the collection side to guarantee complete SOA PDF rendering
            $invoice->setRelation('payments', $collection->payments);
            $invoice->amount_received = $collection->paid_amount;
            $invoice->balance = $collection->remaining_balance;
            $invoice->status = ($collection->remaining_balance <= 0) ? 'paid' : (($collection->paid_amount > 0) ? 'partial' : 'pending_payment');
        } else {
            // Build a virtual Invoice object that the Blade template can consume
            $invoice = new Invoice([
                'invoice_number' => 'COL-'.str_pad($collection->id, 6, '0', STR_PAD_LEFT),
                'customer_name' => $collection->client_name,
                'customer_email' => $email ?? '',
                'customer_contact' => $collection->customer?->phone ?? '',
                'customer_address' => $collection->customer?->address ?? '',
                'subtotal' => $collection->billing_amount ?? $collection->rate ?? 0,
                'tax_amount' => 0,
                'total_amount' => $collection->billing_amount ?? $collection->rate ?? 0,
                'amount_received' => $collection->paid_amount ?? 0,
                'change' => 0,
                'payment_method' => $collection->payments->last()?->payment_method ?? 'Cash',
                'payment_type' => 'downpayment',
                'balance' => $collection->remaining_balance ?? ($collection->rate ?? 0),
                'due_date' => $collection->due_date,
                'travel_date' => $collection->travel_date ?? $collection->due_date,
                'pick_up' => $collection->pick_up ?? null,
                'drop_off' => $collection->drop_off ?? null,
                'service_type' => $collection->service_type,
                'other_service_type' => $collection->other_service_type,
                'status' => ($collection->remaining_balance ?? 1) <= 0 ? 'paid' : (($collection->paid_amount ?? 0) > 0 ? 'partial' : 'pending'),
                'created_at' => $collection->created_at,
            ]);

            $invoice->setRelation('items', collect([]));
            $invoice->setRelation('payments', $collection->payments);
        }

        return [
            'invoice' => $invoice,
            'taxRate' => 0,
        ];
    }

    /**
     * View SOA as inline PDF in the browser.
     */
    public function viewSoa($id)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);
        $pdfData = $this->buildSoaInvoice($collection);

        $fileName = 'SOA_'.($pdfData['invoice']->invoice_number ?? 'COL-'.$id).'.pdf';

        $pdf = Pdf::loadView('pdf.statement_of_account', $pdfData)
            ->setPaper('A4', 'portrait');

        return $pdf->stream($fileName);
    }

    /**
     * Force-download the SOA as a PDF file.
     */
    public function downloadSoa($id)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);
        $pdfData = $this->buildSoaInvoice($collection);

        $fileName = 'SOA_'.($pdfData['invoice']->invoice_number ?? 'COL-'.$id).'.pdf';

        $pdf = Pdf::loadView('pdf.statement_of_account', $pdfData)
            ->setPaper('A4', 'portrait');

        return $pdf->download($fileName);
    }

    public function cancelAndRefund($id)
    {
        $collection = Collection::with('invoice.salesOrder')->findOrFail($id);
        if (! $collection->invoice) {
            return response()->json(['success' => false, 'message' => 'This collection has no invoice to cancel.'], 422);
        }
        $order = $collection->invoice->salesOrder
            ?? app(SalesOrderService::class)->captureInvoice($collection->invoice, auth()->id());
        $adjustment = app(SalesLifecycleService::class)->request(
            $order, 'cancellation', request('reason', 'Cancellation requested from Collections'), [], auth()->id() ?? 1
        );

        return response()->json([
            'success' => true,
            'message' => 'Cancellation submitted for approval. Any eligible refund will require a posted credit note and separate approval.',
            'data' => $adjustment,
        ], 202);
    }
}
