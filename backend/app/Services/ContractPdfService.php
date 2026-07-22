<?php

namespace App\Services;

use App\Models\Contract;
class ContractPdfService
{
    public function generate(Contract $contract)
    {
        $contract->loadMissing([
            'invoice.items.service',
            'invoice.itineraries',
            'invoice.passengers',
            'invoice.paymentSchedules',
            'invoice.customTransactionDetail',
        ]);

        return app(DocumentPdfService::class)->render('pdf.contract', [
            'contract' => $contract,
            'invoice' => $contract->invoice,
        ]);
    }
}
