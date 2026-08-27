<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Models\Invoice;
use App\Services\InvoiceDocumentMailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendInvoiceDocumentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public readonly int $invoiceId,
        public readonly ?int $contractId = null,
        public readonly bool $sendBookingConfirmation = false,
    ) {}

    public function handle(InvoiceDocumentMailService $mail): void
    {
        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->find($this->invoiceId);
        if (! $invoice) {
            return;
        }

        $recipient = $invoice->notificationEmail();
        if (! $recipient) {
            return;
        }

        $contract = $this->contractId ? Contract::find($this->contractId) : null;
        $mail->send($invoice, $recipient, $this->sendBookingConfirmation, $contract);
    }
}
