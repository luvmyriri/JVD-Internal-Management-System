<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class VisaRequirementController extends Controller
{
    /**
     * Proxy request to TravelBuddy Visa Requirements API on RapidAPI.
     */
    public function getRequirements(Request $request): JsonResponse
    {
        $request->validate([
            'passport'    => ['nullable', 'string', 'max:5'],
            'destination' => ['required', 'string', 'max:5'],
        ]);

        $passport = $request->input('passport', 'PH');
        $destination = $request->input('destination');
        $apiKey = env('TRAVELBUDDY_API_KEY');

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'TravelBuddy API key is not configured in the system.',
            ], 500);
        }

        try {
            $response = Http::withHeaders([
                'x-rapidapi-host' => 'visa-requirement.p.rapidapi.com',
                'x-rapidapi-key'  => $apiKey,
            ])->asForm()->post('https://visa-requirement.p.rapidapi.com/v2/visa/check', [
                'passport'    => $passport,
                'destination' => $destination,
            ]);

            if ($response->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch visa requirements from the external API.',
                    'details' => $response->json() ?: $response->body(),
                ], $response->status());
            }

            return response()->json([
                'success' => true,
                'data'    => $response->json(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while connecting to the visa requirements service.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
