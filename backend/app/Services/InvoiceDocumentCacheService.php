<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;

class InvoiceDocumentCacheService
{
    public const INVOICE = 'invoice';

    public const PAYMENT_RECEIPT = 'payment-receipt';

    public const STATEMENT = 'statement-of-account';

    public const SERVICE_AGREEMENT = 'service-agreement';

    public function __construct(
        private readonly DocumentPdfService $documents,
        private readonly GeneralServiceAgreementPdfService $agreements,
    ) {}

    public function contents(Invoice $invoice, string $document): string
    {
        $this->assertSupported($document);
        $this->prepareInvoice($invoice);

        $fingerprint = $this->fingerprint($invoice);
        $directory = "invoice-documents/{$invoice->id}/{$fingerprint}";
        $path = "{$directory}/{$document}.pdf";
        $disk = Storage::disk('local');

        if ($disk->exists($path)) {
            $cached = $disk->get($path);
            if (is_string($cached) && str_starts_with($cached, '%PDF')) {
                return $cached;
            }
        }

        $contents = $this->render($invoice, $document);
        if (! str_starts_with($contents, '%PDF')) {
            throw new RuntimeException("The generated {$document} is not a valid PDF.");
        }

        if (! $disk->put($path, $contents)) {
            throw new RuntimeException("The generated {$document} could not be cached.");
        }

        foreach ($disk->directories("invoice-documents/{$invoice->id}") as $existingDirectory) {
            if ($existingDirectory !== $directory) {
                $disk->deleteDirectory($existingDirectory);
            }
        }

        return $contents;
    }

    public function fileName(Invoice $invoice, string $document): string
    {
        return match ($document) {
            self::INVOICE => "Invoice_{$invoice->invoice_number}.pdf",
            self::PAYMENT_RECEIPT => "Payment_Receipt_{$invoice->invoice_number}.pdf",
            self::STATEMENT => "SOA_Collection_Form_{$invoice->invoice_number}.pdf",
            self::SERVICE_AGREEMENT => "Service_Agreement_and_Terms_{$invoice->invoice_number}.pdf",
            default => throw new InvalidArgumentException("Unsupported invoice document: {$document}"),
        };
    }

    private function prepareInvoice(Invoice $invoice): void
    {
        $invoice->loadMissing(Invoice::operationalDocumentRelations());
        $invoice->setRelation('payments', $invoice->collection?->payments ?? collect());
    }

    private function fingerprint(Invoice $invoice): string
    {
        $settingsUpdatedAt = SystemSetting::query()->max('updated_at');
        $payload = [
            'invoice' => $invoice->toArray(),
            'settings_updated_at' => $settingsUpdatedAt,
        ];

        return substr(hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)), 0, 24);
    }

    private function render(Invoice $invoice, string $document): string
    {
        $data = ['invoice' => $invoice, 'taxRate' => 0];

        return match ($document) {
            self::INVOICE => $this->documents->render('pdf.invoice', $data)->output(),
            self::PAYMENT_RECEIPT => $this->documents->render('pdf.payment-receipt', $data)->output(),
            self::STATEMENT => $this->documents->render('pdf.statement_of_account', $data)->output(),
            self::SERVICE_AGREEMENT => $this->agreements->generate($invoice)->output(),
        };
    }

    private function assertSupported(string $document): void
    {
        if (! in_array($document, [
            self::INVOICE,
            self::PAYMENT_RECEIPT,
            self::STATEMENT,
            self::SERVICE_AGREEMENT,
        ], true)) {
            throw new InvalidArgumentException("Unsupported invoice document: {$document}");
        }
    }
}
