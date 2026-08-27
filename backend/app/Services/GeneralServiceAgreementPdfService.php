<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Invoice;
use App\Models\SystemSetting;

class GeneralServiceAgreementPdfService
{
    public function generate(Invoice $invoice)
    {
        $invoice->loadMissing(Invoice::operationalDocumentRelations());

        $depositPercent = (float) SystemSetting::getValue('sales.default_deposit_percent', 30);
        $tiers = collect(SystemSetting::getValue('sales.cancellation_tiers', []));
        $cancellationTerms = $tiers->map(
            fn (array $tier): string => sprintf(
                'Cancellations made %s or more days before travel are eligible for a %s%% refund, subject to documented non-refundable supplier charges.',
                $tier['days'] ?? 0,
                $tier['refund'] ?? 0,
            )
        );

        $terms = collect([
            'The invoice, confirmed itinerary, inclusions, exclusions, passenger details, and approved service schedule form the complete booking scope.',
            'The customer must provide accurate participant, guardian, emergency, medical, and accessibility information before the service date.',
            "A deposit of {$depositPercent}% may be required to reserve services. Any outstanding balance must be settled by the due date stated on the invoice or statement of account.",
            'Changes to dates, destinations, passenger counts, vehicles, or inclusions are subject to availability and written confirmation by JVD.',
            'JVD may use accredited transport, venue, accommodation, and activity providers when required to deliver the confirmed package.',
            'Liquor, illegal drugs, unsafe conduct, and deliberate property damage are prohibited. The customer is responsible for damage caused by members of the traveling party.',
            'Travelers remain responsible for personal belongings and for following the safety instructions of the assigned driver, coordinator, venue, and service providers.',
        ])->merge($cancellationTerms);

        $agreement = new Contract([
            'contract_number' => 'AGR-'.$invoice->invoice_number,
            'status' => 'issued',
            'terms_snapshot' => $terms->implode("\n"),
            'deposit_required_percent' => $depositPercent,
            'deposit_required_amount' => round((float) $invoice->total_amount * ($depositPercent / 100), 2),
            'created_by' => $invoice->created_by,
        ]);
        $agreement->setRelation('invoice', $invoice);
        $agreement->created_at = $invoice->created_at ?? now();

        return app(DocumentPdfService::class)->render('pdf.contract', [
            'contract' => $agreement,
            'invoice' => $invoice,
            'generalCopy' => true,
        ]);
    }
}
