<?php

namespace App\Services;

use App\Mail\BookingConfirmationMail;
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
        $invoice->load(Invoice::operationalDocumentRelations());
        $mailer = Mail::mailer(config('mail.transactional_mailer', 'smtp'));

        $mailer->to($recipient)->sendNow(new TransactionNotificationMail($invoice));

        if ($sendBookingConfirmation) {
            $mailer->to($recipient)->sendNow(new BookingConfirmationMail($invoice, $contract));
        }
    }
}
