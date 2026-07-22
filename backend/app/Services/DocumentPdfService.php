<?php

namespace App\Services;

use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;

class DocumentPdfService
{
    public function companyProfile(): array
    {
        return [
            'name' => SystemSetting::getValue('company.legal_name', 'JVD Event & Travel Management Company'),
            'address' => SystemSetting::getValue('company.address', 'UNIT 6 - Aryanna Village Center, Brgy 175 Susano Road, Camarin, Caloocan City'),
            'phone' => SystemSetting::getValue('company.phone', '0976 471 1294'),
            'email' => SystemSetting::getValue('company.email', 'accounts@jvd-travel.com'),
            'registration' => SystemSetting::getValue('company.registration', '912-883-911-000'),
        ];
    }

    public function render(string $view, array $data = [], string $paper = 'a4', string $orientation = 'portrait')
    {
        return Pdf::loadView($view, [...$data, 'company' => $this->companyProfile(), 'generatedAt' => now()])
            ->setPaper($paper, $orientation);
    }
}
