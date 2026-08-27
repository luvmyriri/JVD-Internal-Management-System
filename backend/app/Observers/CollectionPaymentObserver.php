<?php

namespace App\Observers;

use App\Models\CollectionPayment;

class CollectionPaymentObserver
{
    /**
     * Handle the CollectionPayment "created" event.
     */
    public function created(CollectionPayment $collectionPayment): void
    {
        // Ledger Posting: Recognize Cash Receipt
        $ledger = app(\App\Services\LedgerService::class);
        $ledger->seedDefaultAccounts();
        
        $arAccount = \App\Models\Account::where('code', '1300')->first();
        // Determine debit account based on payment method
        $method = strtolower($collectionPayment->payment_method ?? 'cash');
        $cashAccountCode = in_array($method, ['gcash', 'card', 'bank', 'bank transfer']) ? '1000' : '1100';
        $cashAccount = \App\Models\Account::where('code', $cashAccountCode)->first();
        $paymentDate = $collectionPayment->payment_date ?: now()->setTimezone(config('app.timezone', 'Asia/Manila'))->toDateString();

        if ($arAccount && $cashAccount && $collectionPayment->amount > 0) {
            $ledger->recordEntry(
                $paymentDate,
                "Payment received for Collection #{$collectionPayment->collection_id}",
                [
                    [
                        'account_id' => $cashAccount->id,
                        'debit' => $collectionPayment->amount,
                        'credit' => 0,
                        'description' => "Cash receipt ({$collectionPayment->payment_method})"
                    ],
                    [
                        'account_id' => $arAccount->id,
                        'debit' => 0,
                        'credit' => $collectionPayment->amount,
                        'description' => "AR reduction"
                    ]
                ],
                $collectionPayment
            );
        }
    }

    /**
     * Handle the CollectionPayment "updated" event.
     */
    public function updated(CollectionPayment $collectionPayment): void
    {
        // If needed in the future
    }

    /**
     * Handle the CollectionPayment "deleted" event.
     */
    public function deleted(CollectionPayment $collectionPayment): void
    {
        // Reverse journal entries if needed, but standard accounting prefers adjusting entries.
    }
}
