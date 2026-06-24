<?php

namespace App\Mail;

use App\Models\CustomerPortalToken;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class DocumentsCompleteMail extends Mailable
{

    public CustomerPortalToken $portalToken;

    public function __construct(CustomerPortalToken $portalToken)
    {
        $this->portalToken = $portalToken;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'All Required Documents Received',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.documents-complete',
        );
    }
}
