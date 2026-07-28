<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class VisaRequirementController extends Controller
{
    /**
     * Proxy request to TravelBuddy Visa Requirements API on RapidAPI with local fallback.
     */
    public function getRequirements(\App\Http\Requests\Travel\GetVisaRequirementsRequest $request): JsonResponse
    {
        $request->validated();

        $passport = $request->input('passport', 'PH');
        $destination = $request->input('destination', 'General');
        $apiKey = env('TRAVELBUDDY_API_KEY');

        if (!$apiKey) {
            return response()->json([
                'success' => true,
                'data' => $this->getFallbackRequirements($destination),
                'source' => 'local_catalog',
            ]);
        }

        try {
            $response = Http::withHeaders([
                'x-rapidapi-host' => 'visa-requirement.p.rapidapi.com',
                'x-rapidapi-key'  => $apiKey,
            ])->timeout(4)->asForm()->post('https://visa-requirement.p.rapidapi.com/v2/visa/check', [
                'passport'    => $passport,
                'destination' => $destination,
            ]);

            if ($response->failed()) {
                return response()->json([
                    'success' => true,
                    'data'    => $this->getFallbackRequirements($destination),
                    'source'  => 'local_fallback',
                ]);
            }

            return response()->json([
                'success' => true,
                'data'    => $response->json(),
                'source'  => 'rapidapi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'data'    => $this->getFallbackRequirements($destination),
                'source'  => 'local_fallback',
            ]);
        }
    }

    private function getFallbackRequirements(string $destination): array
    {
        $destUpper = strtoupper(trim($destination));

        $standardDocs = [
            'Valid Philippine Passport (at least 6 months validity from departure)',
            'Duly completed and signed Visa Application Form with 2x2 photo',
            'Original Bank Certificate & Bank Statement (last 6 months)',
            'Certificate of Employment / BIR Form 2316 or DTI/SEC Business Registration',
            'Roundtrip Flight Itinerary & Hotel Accommodation Confirmation',
            'Travel Insurance Coverage (Minimum $50,000 USD emergency health coverage)',
        ];

        if (str_contains($destUpper, 'JAPAN')) {
            return [
                'destination' => 'Japan',
                'visa_required' => true,
                'category' => 'Tourist Visa (Single / Multiple Entry)',
                'processing_days' => '3-5 Business Days',
                'requirements' => array_merge($standardDocs, [
                    'PSA Authenticated Birth Certificate (issued within 1 year)',
                    'PSA Authenticated Marriage Certificate (if married)',
                    'Detailed Day-by-Day Japan Travel Itinerary',
                ]),
            ];
        }

        if (str_contains($destUpper, 'KOREA') || str_contains($destUpper, 'SOUTH KOREA')) {
            return [
                'destination' => 'South Korea',
                'visa_required' => true,
                'category' => 'C-3-9 Tourist Visa',
                'processing_days' => '5-7 Business Days',
                'requirements' => array_merge($standardDocs, [
                    'Original Bank Certificate with Account Type and Average Daily Balance (ADB)',
                    'Latest ITR 2316 with BIR stamp or e-Filing confirmation',
                ]),
            ];
        }

        if (str_contains($destUpper, 'SCHENGEN') || str_contains($destUpper, 'FRANCE') || str_contains($destUpper, 'GERMANY') || str_contains($destUpper, 'ITALY')) {
            return [
                'destination' => $destination,
                'visa_required' => true,
                'category' => 'Schengen Short-Stay Tourist Visa (Type C)',
                'processing_days' => '15 Business Days',
                'requirements' => array_merge($standardDocs, [
                    'Schengen Approved Travel Insurance (Minimum EUR 30,000 medical emergency coverage)',
                    'Proof of financial solvency (Bank Statements + Approved Leave of Absence)',
                ]),
            ];
        }

        return [
            'destination' => $destination,
            'visa_required' => true,
            'category' => 'Standard Tourist Visa / Document Checklist',
            'processing_days' => '5-10 Business Days',
            'requirements' => $standardDocs,
        ];
    }
}
