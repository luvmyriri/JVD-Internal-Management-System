<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Models\EducationalTourParticipantBooking;
use App\Models\Invoice;
use App\Services\InvoiceDocumentMailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use RuntimeException;
use Throwable;

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
        public readonly ?string $recipient = null,
    ) {
        $this->onQueue('mail');
    }

    public function handle(InvoiceDocumentMailService $mail): void
    {
        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->find($this->invoiceId);
        if (! $invoice) {
            throw new RuntimeException("Invoice {$this->invoiceId} no longer exists.");
        }

        $recipient = $this->recipient ?: $invoice->notificationEmail();
        if (! $recipient) {
            throw new RuntimeException("Invoice {$this->invoiceId} has no document delivery recipient.");
        }

        $this->updateParticipantDelivery([
            'document_delivery_status' => 'sending',
            'document_delivery_recipient' => $recipient,
            'document_delivery_failed_at' => null,
            'document_delivery_error' => null,
        ]);

        $contract = $this->contractId ? Contract::find($this->contractId) : null;
        $mail->send($invoice, $recipient, $this->sendBookingConfirmation, $contract);

        $this->updateParticipantDelivery([
            'document_delivery_status' => 'sent',
            'document_delivery_recipient' => $recipient,
            'document_delivery_sent_at' => now(),
            'document_delivery_failed_at' => null,
            'document_delivery_error' => null,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->updateParticipantDelivery([
            'document_delivery_status' => 'failed',
            'document_delivery_failed_at' => now(),
            'document_delivery_error' => 'Delivery failed after automatic retries. Verify the recipient address and try again.',
        ]);
    }

    private function updateParticipantDelivery(array $attributes): void
    {
        EducationalTourParticipantBooking::query()
            ->where('invoice_id', $this->invoiceId)
            ->update($attributes);
    }
}
