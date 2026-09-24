<?php

namespace App\Jobs;

use App\Mail\QuotationMail;
use App\Models\EducationalTourPackage;
use App\Models\SalesQuotation;
use App\Services\CustomerMailTransport;
use App\Services\DocumentPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;
use Throwable;

class SendQuotationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public array $backoff = [10, 30, 60];

    public function __construct(
        public readonly string $kind,
        public readonly int $quotationId,
        public readonly string $recipient,
    ) {
        $this->onQueue('mail');
    }

    public function handle(DocumentPdfService $documents): void
    {
        if ($this->kind === 'sales') {
            $quotation = SalesQuotation::findOrFail($this->quotationId);
            $pdf = $documents->render('pdf.sales-quotation', ['quotation' => $quotation])->output();
            $customerName = $quotation->client_name;
            $reference = $quotation->quotation_number;
        } elseif ($this->kind === 'educational') {
            $package = EducationalTourPackage::with(['program', 'schoolCustomer'])->findOrFail($this->quotationId);
            $pdf = $documents->render('pdf.quotation-template', ['package' => $package])->output();
            $customerName = $package->school_name ?: 'Customer';
            $reference = $package->tour_code;
        } else {
            throw new InvalidArgumentException('Unknown quotation type.');
        }

        Mail::mailer(app(CustomerMailTransport::class)->mailerName())
            ->to($this->recipient)
            ->sendNow(new QuotationMail($customerName, $reference, $pdf));

        if ($this->kind === 'sales') {
            $quotation->update(['status' => 'sent']);
        }
    }

    public function failed(?Throwable $exception): void
    {
        if ($this->kind === 'sales') {
            SalesQuotation::whereKey($this->quotationId)->update(['status' => 'delivery_failed']);
        }
    }
}
