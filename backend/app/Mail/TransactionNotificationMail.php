<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Services\DocumentPdfService;
use App\Services\GeneralServiceAgreementPdfService;
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
        $pdfData = [
            'invoice' => $this->invoice,
            'taxRate' => 0,
        ];

        $attachments = [];

        // Every transaction receives the invoice; a receipt is a separate document
        // generated only after payment is settled.
        $documents = app(DocumentPdfService::class);
        $invoicePdf = $documents->render('pdf.invoice', $pdfData);
        $invoiceName = "Invoice_{$this->invoice->invoice_number}.pdf";
        $attachments[] = Attachment::fromData(fn () => $invoicePdf->output(), $invoiceName)
            ->withMime('application/pdf');

        if ($this->invoice->status === 'paid') {
            $receiptPdf = $documents->render('pdf.payment-receipt', $pdfData);
            $attachments[] = Attachment::fromData(fn () => $receiptPdf->output(), "Payment_Receipt_{$this->invoice->invoice_number}.pdf")
                ->withMime('application/pdf');
        }

        // The SOA remains useful after settlement because it confirms the full
        // billing and payment history. Always include it with the invoice.
        $soaPdf = $documents->render('pdf.statement_of_account', $pdfData);
        $soaName = "SOA_Collection_Form_{$this->invoice->invoice_number}.pdf";
        $attachments[] = Attachment::fromData(fn () => $soaPdf->output(), $soaName)
            ->withMime('application/pdf');

        if ($this->invoice->isPackageBooking()) {
            $agreementPdf = app(GeneralServiceAgreementPdfService::class)->generate($this->invoice);
            $attachments[] = Attachment::fromData(
                fn () => $agreementPdf->output(),
                "Service_Agreement_and_Terms_{$this->invoice->invoice_number}.pdf",
            )->withMime('application/pdf');
        }

        return $attachments;
    }
}
