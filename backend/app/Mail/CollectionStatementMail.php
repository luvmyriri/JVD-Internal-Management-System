<?php

namespace App\Mail;

use App\Models\Collection;
use App\Models\Invoice;
use App\Services\CollectionStatementService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CollectionStatementMail extends Mailable
{
    use Queueable, SerializesModels;

    public Invoice $invoice;

    public function __construct(public Collection $collection)
    {
        $this->invoice = app(CollectionStatementService::class)->invoice($collection);
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your JVD Statement of Account (#{$this->invoice->invoice_number})");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.collection-statement');
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        $statements = app(CollectionStatementService::class);

        return [
            Attachment::fromData(
                fn () => $statements->contents($this->collection),
                $statements->fileName($this->collection),
            )->withMime('application/pdf'),
        ];
    }
}
