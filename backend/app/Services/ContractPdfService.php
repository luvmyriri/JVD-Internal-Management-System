<?php

namespace App\Services;

use App\Models\Contract;
use Barryvdh\DomPDF\Facade\Pdf;

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

        return Pdf::loadView('pdf.contract', ['contract' => $contract, 'invoice' => $contract->invoice]);
    }
}
