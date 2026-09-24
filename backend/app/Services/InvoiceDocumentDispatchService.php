<?php

namespace App\Services;

use App\Jobs\SendInvoiceDocumentsJob;
use App\Models\Invoice;
use Illuminate\Support\Str;
use InvalidArgumentException;

class InvoiceDocumentDispatchService
{
    public const STALLED_AFTER_MINUTES = 5;

    public function queue(
        Invoice $invoice,
        ?int $contractId = null,
        bool $sendBookingConfirmation = false,
        ?string $recipient = null,
    ): bool {
        $recipient ??= $invoice->notificationEmail();
        if (! $recipient) {
            throw new InvalidArgumentException("Invoice {$invoice->id} has no document delivery recipient.");
        }
        $invoice->refresh();
        $contentHash = $this->contentHash($invoice, $contractId, $sendBookingConfirmation);
        if (in_array($invoice->document_delivery_status, ['queued', 'sending'], true)
            && $invoice->document_delivery_queued_at?->isAfter(now()->subMinutes(self::STALLED_AFTER_MINUTES))
            && $invoice->document_delivery_content_hash === $contentHash) {
            if ($invoice->document_delivery_recipient !== $recipient) {
                throw new InvalidArgumentException('An invoice email is already being delivered. Wait for it to finish before changing the recipient.');
            }

            return false;
        }
        $token = (string) Str::uuid();
        $invoice->forceFill([
            'customer_email' => $recipient,
            'document_delivery_status' => 'queued',
            'document_delivery_token' => $token,
            'document_delivery_content_hash' => $contentHash,
            'document_delivery_recipient' => $recipient,
            'document_delivery_queued_at' => now(),
            'document_delivery_sent_at' => null,
            'document_delivery_failed_at' => null,
            'document_delivery_error' => null,
        ])->save();

        SendInvoiceDocumentsJob::dispatch($invoice->id, $contractId, $sendBookingConfirmation, $recipient, $token)->afterCommit();

        return true;
    }

    private function contentHash(Invoice $invoice, ?int $contractId, bool $sendBookingConfirmation): string
    {
        $collection = $invoice->collection;
        $payload = [
            'contract_id' => $contractId,
            'send_booking_confirmation' => $sendBookingConfirmation,
            'invoice' => $invoice->only([
                'invoice_number', 'customer_id', 'customer_name', 'customer_address',
                'customer_contact', 'subtotal', 'tax_amount', 'total_amount', 'amount_received',
                'change', 'balance', 'credited_amount', 'refunded_amount', 'payment_method',
                'payment_type', 'due_date', 'status', 'notes', 'finalized_snapshot',
            ]),
            'items' => $invoice->items()->orderBy('id')->get()->toArray(),
            'collection' => $collection?->only(['id', 'paid_amount', 'remaining_balance', 'collection_status']),
            'payments' => $collection?->payments()->orderBy('id')->get()->toArray(),
        ];

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
    }
}
