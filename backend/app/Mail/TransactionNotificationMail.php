<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Services\InvoiceDocumentCacheService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TransactionNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $invoice;

    /**
     * Create a new message instance.
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice->load(Invoice::operationalDocumentRelations());
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->invoice->status === 'paid'
            ? "Your Official JVD Invoice (#{$this->invoice->invoice_number})"
            : "Action Required: Statement of Account (#{$this->invoice->invoice_number})";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.transaction-receipt',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $this->invoice->load(Invoice::operationalDocumentRelations());
        $attachments = [];

        // Every transaction receives the invoice; a receipt is a separate document
        // generated only after payment is settled.
        $documents = app(InvoiceDocumentCacheService::class);
        $attachments[] = Attachment::fromData(
            fn () => $documents->contents($this->invoice, InvoiceDocumentCacheService::INVOICE),
            $documents->fileName($this->invoice, InvoiceDocumentCacheService::INVOICE),
        )
            ->withMime('application/pdf');

        if ($this->invoice->status === 'paid') {
            $attachments[] = Attachment::fromData(
                fn () => $documents->contents($this->invoice, InvoiceDocumentCacheService::PAYMENT_RECEIPT),
                $documents->fileName($this->invoice, InvoiceDocumentCacheService::PAYMENT_RECEIPT),
            )
                ->withMime('application/pdf');
        }

        // The SOA remains useful after settlement because it confirms the full
        // billing and payment history. Always include it with the invoice.
        $attachments[] = Attachment::fromData(
            fn () => $documents->contents($this->invoice, InvoiceDocumentCacheService::STATEMENT),
            $documents->fileName($this->invoice, InvoiceDocumentCacheService::STATEMENT),
        )
            ->withMime('application/pdf');

        if ($this->invoice->isPackageBooking()) {
            $attachments[] = Attachment::fromData(
                fn () => $documents->contents($this->invoice, InvoiceDocumentCacheService::SERVICE_AGREEMENT),
                $documents->fileName($this->invoice, InvoiceDocumentCacheService::SERVICE_AGREEMENT),
            )->withMime('application/pdf');
        }

        return $attachments;
    }
}
