<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Throwable;

class TollEstimateService
{
    public function estimate(array $points, string $vehicleClass = 'bus'): array
    {
        $apiKey = config('services.tollguru.api_key');
        if (! $apiKey || count($points) < 2) {
            return $this->manualFallback('TollGuru is not configured. Enter toll values manually and verify them against TRB.');
        }

        $origin = array_shift($points);
        $destination = array_pop($points);
        $payload = [
            'from' => $this->coordinates($origin),
            'to' => $this->coordinates($destination),
            'serviceProvider' => config('services.tollguru.map_provider', 'here'),
            'vehicle' => [
                'type' => in_array($vehicleClass, ['bus', 'coaster'], true)
                    ? config('services.tollguru.bus_vehicle_type', '2AxlesBus')
                    : '2AxlesAuto',
            ],
        ];
        if ($points !== []) {
            $payload['waypoints'] = array_map(fn (array $point) => $this->coordinates($point), $points);
        }

        try {
            $response = Http::withHeaders(['x-api-key' => $apiKey])
                ->acceptJson()
                ->timeout(25)
                ->post(rtrim(config('services.tollguru.base_url'), '/').'/origin-destination-waypoints', $payload)
                ->throw()
                ->json();
        } catch (Throwable) {
            return $this->manualFallback('Automated toll lookup was unavailable. Enter toll values manually and verify them against TRB.');
        }

        if (strtolower((string) ($response['status'] ?? '')) !== 'ok') {
            return $this->manualFallback('TollGuru did not return a usable route. Enter toll values manually and verify them against TRB.');
        }

        $route = collect($response['routes'] ?? [])->sortBy(fn (array $candidate) => $candidate['costs']['minimumTollCost'] ?? PHP_FLOAT_MAX
        )->first();
        $currency = strtoupper((string) ($response['summary']['currency'] ?? 'PHP'));
        if (! $route || $currency !== 'PHP') {
            return $this->manualFallback('No Philippine-peso toll estimate was returned. Enter toll values manually and verify them against TRB.');
        }

        $categories = ['toll_gate_fees' => 0.0, 'easytrip' => 0.0, 'autosweep' => 0.0];
        foreach ($route['tolls'] ?? [] as $toll) {
            $cost = $this->preferredCost($toll);
            $searchable = strtolower(implode(' ', array_filter([
                $toll['name'] ?? null,
                $toll['road'] ?? null,
                implode(' ', $toll['tagPrimaryNames'] ?? []),
                implode(' ', $toll['tollAgencyNames'] ?? []),
            ])));

            if (preg_match('/easytrip|nlex|sctex|cavitex|calax|c5 link/', $searchable)) {
                $categories['easytrip'] += $cost;
            } elseif (preg_match('/autosweep|slex|skyway|star toll|naiax|mcx|tplex/', $searchable)) {
                $categories['autosweep'] += $cost;
            } else {
                $categories['toll_gate_fees'] += $cost;
            }
        }

        $categorizedTotal = array_sum($categories);
        $providerTotal = (float) ($route['costs']['tag']
            ?? $route['costs']['minimumTollCost']
            ?? $route['costs']['cash']
            ?? 0);
        if ($categorizedTotal <= 0 && $providerTotal > 0) {
            $categories['toll_gate_fees'] = $providerTotal;
            $categorizedTotal = $providerTotal;
        }

        return [
            'provider' => 'TollGuru',
            'mode' => 'automatic',
            'currency' => $currency,
            'vehicle_type' => $response['summary']['vehicleType'] ?? $payload['vehicle']['type'],
            'toll_gate_fees' => round($categories['toll_gate_fees'], 2),
            'easytrip' => round($categories['easytrip'], 2),
            'autosweep' => round($categories['autosweep'], 2),
            'total' => round($categorizedTotal, 2),
            'tolls' => collect($route['tolls'] ?? [])->map(fn (array $toll) => [
                'name' => $toll['name'] ?? 'Toll charge',
                'road' => $toll['road'] ?? null,
                'cost' => round($this->preferredCost($toll), 2),
                'currency' => $toll['currency'] ?? $currency,
            ])->values()->all(),
            'url' => config('services.toll_regulatory_board.rates_url'),
            'message' => 'Automated estimate from TollGuru. Values remain editable and should be checked against current TRB matrices.',
        ];
    }

    private function coordinates(array $point): array
    {
        return ['lat' => (float) $point['latitude'], 'lng' => (float) $point['longitude']];
    }

    private function preferredCost(array $toll): float
    {
        return (float) ($toll['tagCost'] ?? $toll['prepaidCardCost'] ?? $toll['cashCost'] ?? 0);
    }

    private function manualFallback(string $message): array
    {
        return [
            'provider' => 'Toll Regulatory Board',
            'mode' => 'manual_reference',
            'currency' => 'PHP',
            'toll_gate_fees' => 0.0,
            'easytrip' => 0.0,
            'autosweep' => 0.0,
            'total' => 0.0,
            'tolls' => [],
            'url' => config('services.toll_regulatory_board.rates_url'),
            'message' => $message,
        ];
    }
}
