<?php

namespace App\Mail;

use App\Models\Contract;
use App\Services\ContractPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GeneratedContractMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Contract $contract) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "JVD Service Contract — {$this->contract->contract_number}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.generated-contract');
    }

    public function attachments(): array
    {
        $pdf = app(ContractPdfService::class)->generate($this->contract);

        return [
            Attachment::fromData(fn () => $pdf->output(), "Contract_{$this->contract->contract_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
