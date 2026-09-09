<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\Invoice;

class CollectionStatementService
{
    public function __construct(private readonly DocumentPdfService $documents) {}

    public function invoice(Collection $collection): Invoice
    {
        $collection->loadMissing(['invoice', 'customer', 'payments']);
        $collection->invoice?->loadMissing(Invoice::operationalDocumentRelations());

        if ($collection->invoice) {
            $invoice = $collection->invoice;
            $invoice->setRelation('payments', $collection->payments);
            $invoice->amount_received = $collection->paid_amount;
            $invoice->balance = $collection->remaining_balance;
            $invoice->status = $collection->remaining_balance <= 0
                ? 'paid'
                : ($collection->paid_amount > 0 ? 'partial' : 'pending_payment');

            return $invoice;
        }

        $invoice = new Invoice([
            'invoice_number' => 'COL-'.str_pad((string) $collection->id, 6, '0', STR_PAD_LEFT),
            'customer_name' => $collection->client_name,
            'customer_email' => $collection->customer?->email ?? '',
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
            'due_date' => $collection->due_date ?? $collection->travel_date,
            'status' => ($collection->remaining_balance ?? 1) <= 0
                ? 'paid'
                : (($collection->paid_amount ?? 0) > 0 ? 'partial' : 'pending'),
        ]);
        $invoice->created_at = $collection->created_at;
        $invoice->setAttribute('travel_date', $collection->travel_date ?? $collection->due_date);
        $invoice->setAttribute('pick_up', $collection->pick_up);
        $invoice->setAttribute('drop_off', $collection->drop_off);
        $invoice->setAttribute('service_type', $collection->service_type);
        $invoice->setAttribute('other_service_type', $collection->other_service_type);
        $invoice->setRelation('items', collect());
        $invoice->setRelation('payments', $collection->payments);

        return $invoice;
    }

    public function contents(Collection $collection): string
    {
        return $this->documents->render('pdf.statement_of_account', [
            'invoice' => $this->invoice($collection),
            'taxRate' => 0,
        ])->output();
    }

    public function fileName(Collection $collection): string
    {
        return 'SOA_'.$this->invoice($collection)->invoice_number.'.pdf';
    }
}
