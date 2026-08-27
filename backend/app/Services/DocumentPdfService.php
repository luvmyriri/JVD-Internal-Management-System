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

    /**
     * Render a PDF from a Blade view.
     *
     * @param string $view Blade view name (e.g. 'pdf.quotation-template')
     * @param array $data Data to pass to the view
     * @param string $paper Paper size (default a4)
     * @param string $orientation Portrait or landscape
     * @return \Barryvdh\DomPDF\PDF
     */
    public function render(string $view, array $data = [], string $paper = 'a4', string $orientation = 'portrait')
    {
        return Pdf::loadView($view, [...$data, 'company' => $this->companyProfile(), 'generatedAt' => now()])
            ->setPaper($paper, $orientation);
    }

    /**
     * Render a PDF using a background PDF template.
     * The template file should be placed under resources/views/pdf/templates/.
     *
     * @param string $templateFile Filename of the PDF template (e.g. 'quotation-template.pdf')
     * @param array $data Data to inject into the view
     * @return \Barryvdh\DomPDF\PDF
     */
    public function renderWithTemplate(string $templateFile, array $data = [], string $paper = 'a4', string $orientation = 'portrait')
    {
        // The Blade view `pdf.template-wrapper` applies the background image.
        $view = 'pdf.template-wrapper';
        $data = array_merge($data, ['templateFile' => $templateFile]);
        return $this->render($view, $data, $paper, $orientation);
    }

}
