<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class QuotationMail extends Mailable
{
    public function __construct(
        public readonly string $customerName,
        public readonly string $reference,
        public readonly string $pdfContents,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "JVD quotation {$this->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.quotation');
    }

    public function attachments(): array
    {
        return [Attachment::fromData(fn () => $this->pdfContents, "Quotation_{$this->reference}.pdf")
            ->withMime('application/pdf')];
    }
}
