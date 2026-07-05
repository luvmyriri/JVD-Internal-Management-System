<?php

namespace App\Mail;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContractSentForSignatureMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Contract $contract;
    public string $signingLink;

    public function __construct(Contract $contract, string $signingLink)
    {
        $this->contract = $contract;
        $this->signingLink = $signingLink;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Action Required: Review & Sign Your JVD Contract ({$this->contract->contract_number})",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contract-signature-request',
        );
    }
}
