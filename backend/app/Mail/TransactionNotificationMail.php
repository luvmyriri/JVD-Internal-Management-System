<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;

class TransactionNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $invoice;
    public $gcashLink;

    /**
     * Create a new message instance.
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
        
        // Generate ready-to-use GCash payment deep link
        $corporatePhone = '09764711294'; // Standard corporate GCash number
        $this->gcashLink = "https://getqr.gcash.com/pay?account={$corporatePhone}&amount=" . urlencode($invoice->balance) . "&note=" . urlencode("INV-{$invoice->invoice_number}");
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
        $pdfData = [
            'invoice' => $this->invoice,
            'taxRate' => 0.12,
        ];

        $attachments = [];

        // 1. Every transaction gets their Receipt/Invoice PDF
        $invoicePdf = Pdf::loadView('pdf.invoice', $pdfData);
        $invoiceName = "Receipt_{$this->invoice->invoice_number}.pdf";
        $attachments[] = Attachment::fromData(fn () => $invoicePdf->output(), $invoiceName)
            ->withMime('application/pdf');

        // 2. Partial/downpayment transactions also get their SOA Collection Form PDF
        if ($this->invoice->status !== 'paid') {
            $soaPdf = Pdf::loadView('pdf.statement_of_account', $pdfData);
            $soaName = "SOA_Collection_Form_{$this->invoice->invoice_number}.pdf";
            $attachments[] = Attachment::fromData(fn () => $soaPdf->output(), $soaName)
                ->withMime('application/pdf');
        }

        return $attachments;
    }
}
