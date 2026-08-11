<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;
use RuntimeException;

class TollMatrixService
{
    private const NETWORK_NAMES = [
        'TPLEX' => 'TPLEX',
        'NLEX_SCTEX' => 'NLEX / SCTEX',
        'SKYWAY3' => 'Skyway Stage 3',
        'NLEX_CONNECTOR' => 'NLEX Connector',
        'NLEX_HARBOR_LINK' => 'NLEX Harbor Link',
        'NAIAX' => 'NAIAX',
        'SLEX_SKYWAY_MCX' => 'SLEX / Skyway / MCX',
        'CAVITEX' => 'CAVITEX',
        'CALAX' => 'CALAX',
        'STAR' => 'STAR Tollway',
    ];

    private const EASYTRIP_NETWORKS = [
        'NLEX_SCTEX', 'NLEX_CONNECTOR', 'NLEX_HARBOR_LINK', 'CAVITEX', 'CALAX',
    ];

    private const AUTOSWEEP_NETWORKS = [
        'TPLEX', 'SKYWAY3', 'NAIAX', 'SLEX_SKYWAY_MCX', 'STAR',
    ];

    /** @return array<string, mixed> */
    public function catalog(): array
    {
        $document = $this->document();
        $networks = collect($document['rates'])
            ->groupBy('network_id')
            ->map(function ($rates, string $networkId): array {
                $points = $rates->flatMap(fn (array $rate) => [
                    ['id' => $rate['entry_point_id'], 'name' => $rate['entry_point'], 'expressway' => $rate['entry_expressway'], 'sequence' => $rate['entry_sequence']],
                    ['id' => $rate['exit_point_id'], 'name' => $rate['exit_point'], 'expressway' => $rate['exit_expressway'], 'sequence' => $rate['exit_sequence']],
                ])->unique('id')->sortBy(fn (array $point) => sprintf('%s-%05d', $point['expressway'], $point['sequence']))->values()->all();

                return [
                    'id' => $networkId,
                    'name' => self::NETWORK_NAMES[$networkId] ?? str_replace('_', ' / ', $networkId),
                    'rfid' => $this->category($networkId),
                    'points' => $points,
                ];
            })->sortBy(fn (array $network) => array_search($network['id'], array_keys(self::NETWORK_NAMES), true))->values()->all();

        return [
            'vehicle_class' => $document['vehicle_class'],
            'vehicle_description' => $document['vehicle_description'],
            'source_name' => $document['source_name'],
            'source_url' => $document['source_url'],
            'official_verification_url' => $document['official_verification_url'],
            'synced_at' => $document['synced_at'],
            'networks' => $networks,
        ];
    }

    /** @param array<int, array<string, mixed>> $segments
     * @return array<string, mixed>
     */
    public function calculate(array $segments): array
    {
        $document = $this->document();
        $rates = collect($document['rates']);
        $totals = ['toll_gate_fees' => 0.0, 'easytrip' => 0.0, 'autosweep' => 0.0];
        $resolved = [];

        foreach ($segments as $index => $segment) {
            $networkId = (string) $segment['network_id'];
            $entryId = (int) $segment['entry_point_id'];
            $exitId = (int) $segment['exit_point_id'];
            $rate = $rates->first(fn (array $candidate) => $candidate['network_id'] === $networkId
                && (($candidate['entry_point_id'] === $entryId && $candidate['exit_point_id'] === $exitId)
                    || ($candidate['reversible'] && $candidate['entry_point_id'] === $exitId && $candidate['exit_point_id'] === $entryId)));

            if (! $rate) {
                throw ValidationException::withMessages([
                    "segments.$index" => 'No published Class 2 rate exists for the selected entry and exit.',
                ]);
            }

            $reversed = $rate['entry_point_id'] === $exitId;
            $category = $this->category($networkId);
            $totals[$category] += (float) $rate['fee'];
            $resolved[] = [
                'network_id' => $networkId,
                'network' => self::NETWORK_NAMES[$networkId] ?? str_replace('_', ' / ', $networkId),
                'entry_point_id' => $entryId,
                'entry_point' => $reversed ? $rate['exit_point'] : $rate['entry_point'],
                'exit_point_id' => $exitId,
                'exit_point' => $reversed ? $rate['entry_point'] : $rate['exit_point'],
                'rfid' => $category,
                'fee' => (float) $rate['fee'],
            ];
        }

        return [
            'provider' => 'toll.ph matrix',
            'mode' => 'matrix',
            'currency' => 'PHP',
            ...array_map(fn (float $value) => round($value, 2), $totals),
            'total' => round(array_sum($totals), 2),
            'segments' => $resolved,
            'source_url' => $document['source_url'],
            'official_verification_url' => $document['official_verification_url'],
            'synced_at' => $document['synced_at'],
        ];
    }

    /** @return array<string, mixed> */
    private function document(): array
    {
        $file = (string) config('services.toll_matrix.data_file');
        if (! is_file($file)) {
            throw new RuntimeException('The local toll matrix is missing. Run php artisan tolls:sync-matrix.');
        }
        $document = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        if (! isset($document['rates']) || ! is_array($document['rates'])) {
            throw new RuntimeException('The local toll matrix is invalid.');
        }

        return $document;
    }

    private function category(string $networkId): string
    {
        if (in_array($networkId, self::EASYTRIP_NETWORKS, true)) {
            return 'easytrip';
        }
        if (in_array($networkId, self::AUTOSWEEP_NETWORKS, true)) {
            return 'autosweep';
        }

        return 'toll_gate_fees';
    }
}
