<?php

namespace App\Services;

use App\Jobs\SendInvoiceDocumentsJob;
use App\Models\Invoice;
use InvalidArgumentException;

class InvoiceDocumentDispatchService
{
    public function queue(
        Invoice $invoice,
        ?int $contractId = null,
        bool $sendBookingConfirmation = false,
        ?string $recipient = null,
    ): void {
        $recipient ??= $invoice->notificationEmail();
        if (! $recipient) {
            throw new InvalidArgumentException("Invoice {$invoice->id} has no document delivery recipient.");
        }
        $invoice->forceFill([
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => $recipient,
            'document_delivery_queued_at' => now(),
            'document_delivery_sent_at' => null,
            'document_delivery_failed_at' => null,
            'document_delivery_error' => null,
        ])->save();

        SendInvoiceDocumentsJob::dispatch($invoice->id, $contractId, $sendBookingConfirmation, $recipient)->afterCommit();
    }
}
