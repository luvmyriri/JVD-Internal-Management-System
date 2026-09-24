<?php

namespace App\Services;

use App\Mail\TransactionNotificationMail;
use App\Models\Contract;
use App\Models\Invoice;
use Illuminate\Support\Facades\Mail;

class InvoiceDocumentMailService
{
    public function send(
        Invoice $invoice,
        string $recipient,
        bool $sendBookingConfirmation = false,
        ?Contract $contract = null,
    ): void {
        $mailerName = app(CustomerMailTransport::class)->mailerName();
        $invoice->load(Invoice::operationalDocumentRelations());
        $mailer = Mail::mailer($mailerName);

        $mailer->to($recipient)->sendNow(new TransactionNotificationMail($invoice, $sendBookingConfirmation, $contract));
    }
}
