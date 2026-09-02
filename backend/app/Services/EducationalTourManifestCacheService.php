<?php

namespace App\Services;

use App\Models\EducationalTourPackage;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class EducationalTourManifestCacheService
{
    private const CACHE_VERSION = 4;

    public function __construct(private readonly DocumentPdfService $documents) {}

    public function contents(EducationalTourPackage $package): string
    {
        $this->preparePackage($package);

        $fingerprint = $this->fingerprint($package);
        $directory = "educational-tour-manifests/{$package->id}";
        $path = "{$directory}/{$fingerprint}.pdf";
        $disk = Storage::disk('local');

        if ($disk->exists($path)) {
            $cached = $disk->get($path);
            if (is_string($cached) && str_starts_with($cached, '%PDF')) {
                return $cached;
            }
        }

        $pdf = $this->documents->render('pdf.educational-tour-package-manifest', ['package' => $package]);
        $pdf->render();

        $domPdf = $pdf->getDomPDF();
        $canvas = $domPdf->getCanvas();
        $canvas->page_script(function (int $pageNumber, int $pageCount, $pageCanvas, $fontMetrics): void {
            $width = $pageCanvas->get_width();
            $height = $pageCanvas->get_height();
            $font = $fontMetrics->getFont('Helvetica', 'normal');
            $textColor = [0.067, 0.094, 0.153];
            $red = [0.843, 0.098, 0.125];
            $blue = [0.09, 0.29, 0.545];

            $pageCanvas->filled_rectangle(0, $height - 48, $width, 40, [0.973, 0.98, 0.988]);
            $pageCanvas->line(0, $height - 50, $width, $height - 50, $red, 2);
            $pageCanvas->text(
                40,
                $height - 43,
                'Confidential student manifest. Use only for the stated educational tour and protect personal information.',
                $font,
                6,
                $textColor,
            );
            $pageCanvas->text(
                40,
                $height - 31,
                'Unit 6 Aryanna Village Center, Brgy. 175, Susano Road, Camarin, Caloocan City | DOT-NCR-TTA-02903-2024',
                $font,
                6,
                $textColor,
            );

            $pageText = "Page {$pageNumber} of {$pageCount}";
            $pageTextWidth = $fontMetrics->getTextWidth($pageText, $font, 6);
            $pageCanvas->text($width - $pageTextWidth - 48, $height - 31, $pageText, $font, 6, $textColor);

            $qualitySeal = public_path('dot-quality-seal.jpg');
            if (is_file($qualitySeal)) {
                $pageCanvas->image($qualitySeal, $width - 38, $height - 45, 25, 25);
            }

            $pageCanvas->filled_rectangle(0, $height - 8, $width, 2, $blue);
            $pageCanvas->filled_rectangle(0, $height - 6, $width, 6, $red);
        });

        $contents = $domPdf->output();

        if (! str_starts_with($contents, '%PDF')) {
            throw new RuntimeException('The generated educational tour manifest is not a valid PDF.');
        }

        if (! $disk->put($path, $contents)) {
            throw new RuntimeException('The educational tour manifest could not be cached.');
        }

        foreach ($disk->files($directory) as $existingPath) {
            if ($existingPath !== $path) {
                $disk->delete($existingPath);
            }
        }

        return $contents;
    }

    public function fileName(EducationalTourPackage $package): string
    {
        $safeCode = preg_replace('/[^A-Za-z0-9_-]+/', '_', $package->tour_code) ?: (string) $package->id;

        return "Educational_Tour_Package_Manifest_{$safeCode}.pdf";
    }

    private function preparePackage(EducationalTourPackage $package): void
    {
        $package->load([
            'program',
            'busAssignments.bus',
            'busAssignments.driver',
            'participantBookings' => function ($query) {
                $query->whereNotIn('status', ['cancelled', 'expired'])
                    ->with(['invoice', 'busAssignment.bus'])
                    ->orderBy('participant_last_name');
            },
        ]);
    }

    private function fingerprint(EducationalTourPackage $package): string
    {
        $payload = [
            'cache_version' => self::CACHE_VERSION,
            'package' => $package->toArray(),
            'settings_updated_at' => SystemSetting::query()->max('updated_at'),
        ];

        return substr(hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)), 0, 24);
    }
}
