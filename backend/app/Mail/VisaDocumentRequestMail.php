<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VisaDocumentRequestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $link;
    public $passportCase;
    public $requestedDocs;

    /**
     * Create a new message instance.
     */
    public function __construct($link, $passportCase, $requestedDocs)
    {
        $this->link = $link;
        $this->passportCase = $passportCase;
        $this->requestedDocs = $requestedDocs;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $typeLabel = $this->passportCase->case_type === 'passport' ? 'Passport' : 'Visa';
        return new Envelope(
            subject: 'Action Required: Submit Documents for ' . $typeLabel . ' Case #' . $this->passportCase->id,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.visa-document-request',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
