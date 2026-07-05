<?php

namespace App\Mail;

use App\Services\ContractPdfService;
use App\Models\Contract;
use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Invoice $invoice;
    public ?Contract $contract;

    public function __construct(Invoice $invoice, ?Contract $contract = null)
    {
        $this->invoice = $invoice;
        $this->contract = $contract;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Booking Confirmed — {$this->invoice->invoice_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking-confirmation',
        );
    }

    public function attachments(): array
    {
        if (!$this->contract || !$this->contract->isFullySigned()) {
            return [];
        }

        $pdf = app(ContractPdfService::class)->generate($this->contract);

        return [
            Attachment::fromData(fn () => $pdf->output(), "Contract_{$this->contract->contract_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
