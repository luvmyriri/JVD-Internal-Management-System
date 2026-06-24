<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use App\Models\Customer;

class CustomerOutreachMail extends Mailable
{

    public $customer;
    public $customSubject;
    public $customMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(Customer $customer, $subject, $message)
    {
        $this->customer = $customer;
        $this->customSubject = $subject;
        $this->customMessage = $message;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->customSubject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.customer-outreach',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
