<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\TransactionNotificationMail;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $query = Collection::with(['payments', 'invoice.items.service', 'customer']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('client_name', 'like', "%$search%")
                  ->orWhere('service_type', 'like', "%$search%")
                  ->orWhereHas('invoice', function($iq) use ($search) {
                      $iq->where('invoice_number', 'like', "%$search%");
                  });
            });
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('collection_status', $request->status);
        }

        // Hide fully-settled (zero balance) records unless the user explicitly views 'completed'
        $isViewingCompleted = $request->has('status') && $request->status === 'completed';
        if (!$isViewingCompleted) {
            $query->where('remaining_balance', '>', 0);
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
            'stats' => $stats
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
            'rate' => 'nullable|numeric',
            'customer_id' => 'nullable|exists:customers,id',
            'payments' => 'nullable|array',
            'payments.*.payment_date' => 'required|date',
            'payments.*.payment_method' => 'required|string',
            'payments.*.amount' => 'required|numeric',
            'payments.*.balance' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($validated) {
            $collectionData = collect($validated)->except('payments')->toArray();

            // Set default billing fields for manual collections so recalculate works perfectly!
            $collectionData['billing_amount'] = $validated['rate'] ?? 0;
            $collectionData['remaining_balance'] = $validated['rate'] ?? 0;
            $collectionData['due_date'] = $validated['travel_date'] ?? null;
            $collectionData['collection_status'] = 'pending';

            $collection = Collection::create($collectionData);

            if (!empty($validated['payments'])) {
                foreach ($validated['payments'] as $payment) {
                    $collection->payments()->create($payment);
                }
            }

            // Recalculate will populate paid_amount, remaining_balance, and status!
            $collection->recalculate();

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
            'rate' => 'sometimes|numeric',
            'payments' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request, $collection, $validated) {
            $collection->update(collect($validated)->except('payments')->toArray());

            // If payments are explicitly provided, we replace the existing ones.
            // A more robust app might only add new payments, but for this form we just sync.
            if ($request->has('payments')) {
                $collection->payments()->delete();
                foreach ($validated['payments'] as $payment) {
                    $collection->payments()->create($payment);
                }
            }

            $collection->recalculate();

            // Send updated invoice email if linked to an invoice and has customer email
            if ($collection->invoice_id) {
                $invoice = $collection->invoice;
                if ($invoice && $invoice->customer_email) {
                    try {
                        @set_time_limit(120);
                        Mail::to($invoice->customer_email)->send(new TransactionNotificationMail($invoice));
                    } catch (\Exception $mailEx) {
                        \Log::error("Failed to send updated payment receipt email on update to {$invoice->customer_email}: " . $mailEx->getMessage());
                    }
                }
            }

            return $collection->load('payments');
        });
    }

    public function destroy($id)
    {
        Collection::findOrFail($id)->delete();
        return response()->json(['message' => 'Collection deleted successfully.']);
    }

    public function confirm($id)
    {
        $collection = Collection::findOrFail($id);

        $collection->update([
            'collection_status' => 'completed',
            'paid_amount'       => $collection->billing_amount,
            'remaining_balance' => 0,
        ]);

        // Sync the linked invoice to paid as well
        if ($collection->invoice_id) {
            $invoice = $collection->invoice;
            if ($invoice) {
                $invoice->update([
                    'status'          => 'paid',
                    'balance'         => 0,
                    'amount_received' => $invoice->total_amount,
                ]);

                if ($invoice->customer_email) {
                    try {
                        @set_time_limit(120);
                        Mail::to($invoice->customer_email)->send(new TransactionNotificationMail($invoice));
                    } catch (\Exception $mailEx) {
                        \Log::error("Failed to send fully paid invoice email to {$invoice->customer_email}: " . $mailEx->getMessage());
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Collection confirmed as fully paid.',
            'data'    => $collection->load('payments'),
        ]);
    }

    public function addPayment(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);
        
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $collection->payments()->create($validated);
        
        $collection->recalculate();

        if ($collection->invoice_id) {
            $invoice = $collection->invoice;
            if ($invoice && $invoice->customer_email) {
                try {
                    @set_time_limit(120);
                    Mail::to($invoice->customer_email)->send(new TransactionNotificationMail($invoice));
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send updated payment receipt email on addPayment to {$invoice->customer_email}: " . $mailEx->getMessage());
                }
            }
        }

        return response()->json([
            'message' => 'Payment added successfully.',
            'data' => $collection->load('payments')
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
            'data' => $collection
        ]);
    }

    public function sendSoaNotification($id)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);

        $email = null;
        if ($collection->invoice && $collection->invoice->customer_email) {
            $email = $collection->invoice->customer_email;
        } elseif ($collection->customer && $collection->customer->email) {
            $email = $collection->customer->email;
        }

        if (!$email) {
            return response()->json([
                'success' => false,
                'message' => 'No valid customer email address found for this collection.'
            ], 400);
        }

        $pdfData = $this->buildSoaInvoice($collection);
        $invoice = $pdfData['invoice'];

        try {
            @set_time_limit(120);
            Mail::to($email)->send(new TransactionNotificationMail($invoice));
            return response()->json([
                'success' => true,
                'message' => 'Statement of Account notification email sent to ' . $email
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build a unified invoice-like object for the SOA PDF.
     * Works for both invoice-linked and standalone collections.
     */
    private function buildSoaInvoice(Collection $collection): array
    {
        $collection->loadMissing(['invoice.items.service', 'customer', 'payments']);

        $email = null;
        if ($collection->invoice && $collection->invoice->customer_email) {
            $email = $collection->invoice->customer_email;
        } elseif ($collection->customer && $collection->customer->email) {
            $email = $collection->customer->email;
        }

        if ($collection->invoice) {
            $invoice = $collection->invoice;
            // Attach the payment history from the collection side as well
            if (!$invoice->relationLoaded('payments')) {
                $invoice->setRelation('payments', $collection->payments);
            }
        } else {
            // Build a virtual Invoice object that the Blade template can consume
            $invoice = new \App\Models\Invoice([
                'invoice_number'   => 'COL-' . str_pad($collection->id, 6, '0', STR_PAD_LEFT),
                'customer_name'    => $collection->client_name,
                'customer_email'   => $email ?? '',
                'customer_contact' => $collection->customer?->phone ?? '',
                'customer_address' => $collection->customer?->address ?? '',
                'subtotal'         => ($collection->billing_amount ?? $collection->rate ?? 0) / 1.12,
                'tax_amount'       => ($collection->billing_amount ?? $collection->rate ?? 0) - (($collection->billing_amount ?? $collection->rate ?? 0) / 1.12),
                'total_amount'     => $collection->billing_amount ?? $collection->rate ?? 0,
                'amount_received'  => $collection->paid_amount ?? 0,
                'change'           => 0,
                'payment_method'   => $collection->payments->last()?->payment_method ?? 'Cash',
                'payment_type'     => 'downpayment',
                'balance'          => $collection->remaining_balance ?? ($collection->rate ?? 0),
                'due_date'         => $collection->due_date,
                'travel_date'      => $collection->travel_date ?? $collection->due_date,
                'pick_up'          => $collection->pick_up ?? null,
                'drop_off'         => $collection->drop_off ?? null,
                'service_type'     => $collection->service_type,
                'other_service_type' => $collection->other_service_type,
                'status'           => ($collection->remaining_balance ?? 1) <= 0 ? 'paid' : (($collection->paid_amount ?? 0) > 0 ? 'partial' : 'pending'),
                'created_at'       => $collection->created_at,
            ]);

            $invoice->setRelation('items', collect([]));
            $invoice->setRelation('payments', $collection->payments);
        }

        return [
            'invoice' => $invoice,
            'taxRate' => 0.12,
        ];
    }

    /**
     * View SOA as inline PDF in the browser.
     */
    public function viewSoa($id)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);
        $pdfData    = $this->buildSoaInvoice($collection);

        $fileName = 'SOA_' . ($pdfData['invoice']->invoice_number ?? 'COL-' . $id) . '.pdf';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.statement_of_account', $pdfData)
            ->setPaper('A4', 'portrait');

        return $pdf->stream($fileName, ['Attachment' => false]);
    }

    /**
     * Force-download the SOA as a PDF file.
     */
    public function downloadSoa($id)
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->findOrFail($id);
        $pdfData    = $this->buildSoaInvoice($collection);

        $fileName = 'SOA_' . ($pdfData['invoice']->invoice_number ?? 'COL-' . $id) . '.pdf';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.statement_of_account', $pdfData)
            ->setPaper('A4', 'portrait');

        return $pdf->download($fileName);
    }
}

