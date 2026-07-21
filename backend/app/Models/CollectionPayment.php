<?php

namespace App\Models;

use App\Services\LedgerService;
use Illuminate\Database\Eloquent\Model;

class CollectionPayment extends Model
{
    protected $fillable = [
        'collection_id', 'payment_date', 'payment_method', 'amount', 'balance', 'idempotency_key'
    ];

    public function collection()
    {
        return $this->belongsTo(Collection::class);
    }

    /**
     * Books a Cash-in-Bank / Service-Revenue journal entry for every collection payment,
     * regardless of which call site created it (checkout sync, CollectionController::addPayment,
     * etc.) — this was previously the only money-in path with no general ledger entry at all.
     */
    protected static function booted(): void
    {
        static::created(function (CollectionPayment $payment) {
            if ((float) $payment->amount <= 0) {
                return;
            }

            $ledger = app(LedgerService::class);
            $ledger->seedDefaultAccounts();
            $cashAccount = Account::where('code', '1000')->first();
            $revenueAccount = Account::where('code', '4000')->first();

            if (!$cashAccount || !$revenueAccount) {
                return;
            }

            $collection = $payment->collection;

            $ledger->recordEntry(
                $payment->payment_date ?? now()->format('Y-m-d'),
                'Collection payment — ' . ($collection?->client_name ?? 'Customer')
                    . ($collection?->invoice_id ? " (Invoice #{$collection->invoice_id})" : ''),
                [
                    ['account_id' => $cashAccount->id, 'debit' => $payment->amount, 'description' => 'Cash received'],
                    ['account_id' => $revenueAccount->id, 'credit' => $payment->amount, 'description' => 'Service revenue'],
                ],
                $payment
            );
        });
    }
}

