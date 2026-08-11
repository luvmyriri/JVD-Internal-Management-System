<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;
use RuntimeException;

class LocalTollRouteMatcher
{
    public function __construct(private readonly TollMatrixService $matrix) {}

    /**
     * @param  array<int, array{0: float|int, 1: float|int}>  $geometry
     * @return array<string, mixed>|null
     */
    public function estimate(array $geometry): ?array
    {
        if (count($geometry) < 2) {
            return null;
        }

        $registry = $this->registry();
        $radius = (float) ($registry['match_radius_km'] ?? 1.25);
        $matches = collect($registry['nodes'])->map(function (array $node) use ($geometry): array {
            [$distance, $routeIndex] = $this->closestRouteVertex(
                (float) $node['latitude'],
                (float) $node['longitude'],
                $geometry
            );

            return [...$node, 'distance_km' => $distance, 'route_index' => $routeIndex];
        })->filter(fn (array $node) => $node['distance_km'] <= $radius)
            ->groupBy('network_id');

        $segments = [];
        $matchedNodes = [];
        foreach ($matches as $networkId => $networkNodes) {
            $ordered = $networkNodes->sortBy('route_index')->values();
            $entry = $ordered->first();
            $exit = $ordered->last();
            if (! $entry || ! $exit || $entry['point'] === $exit['point'] || $entry['route_index'] === $exit['route_index']) {
                continue;
            }
            if ($this->haversine($entry['latitude'], $entry['longitude'], $exit['latitude'], $exit['longitude']) < 1.0) {
                continue;
            }

            $segments[] = [
                'network_id' => $networkId,
                'entry_point_id' => $this->pointId($networkId, $entry['point']),
                'exit_point_id' => $this->pointId($networkId, $exit['point']),
            ];
            $matchedNodes[] = $entry;
            $matchedNodes[] = $exit;
        }

        $segments = array_values(array_filter($segments, fn (array $segment) => $segment['entry_point_id'] && $segment['exit_point_id']));
        if ($segments === []) {
            return null;
        }

        $calculations = collect($segments)->map(function (array $segment): ?array {
            try {
                return $this->matrix->calculate([$segment]);
            } catch (ValidationException) {
                return null;
            }
        })->filter()->values();
        if ($calculations->isEmpty()) {
            return null;
        }

        $resolvedSegments = $calculations->flatMap(fn (array $calculation) => $calculation['segments'])->values()->all();
        $totals = [
            'toll_gate_fees' => round((float) $calculations->sum('toll_gate_fees'), 2),
            'easytrip' => round((float) $calculations->sum('easytrip'), 2),
            'autosweep' => round((float) $calculations->sum('autosweep'), 2),
        ];

        $worstDistance = max(array_column($matchedNodes, 'distance_km'));
        $confidence = $worstDistance <= 0.35 ? 'high' : ($worstDistance <= 0.75 ? 'medium' : 'review');

        return [
            'provider' => 'JVD local Class 2 toll matrix',
            'mode' => 'automatic_matrix',
            'currency' => 'PHP',
            'vehicle_type' => 'Class 2 bus',
            ...$totals,
            'total' => round(array_sum($totals), 2),
            'tolls' => collect($resolvedSegments)->map(fn (array $segment) => [
                'name' => $segment['network'].' - '.$segment['entry_point'].' to '.$segment['exit_point'],
                'road' => $segment['network'],
                'cost' => $segment['fee'],
                'currency' => 'PHP',
            ])->values()->all(),
            'segments' => $resolvedSegments,
            'confidence' => $confidence,
            'matched_node_distance_km' => round($worstDistance, 3),
            'url' => $calculations->first()['official_verification_url'],
            'message' => sprintf(
                'Automatically matched %d expressway segment%s against the local Class 2 matrix (%s confidence). Values remain editable.',
                count($resolvedSegments),
                count($resolvedSegments) === 1 ? '' : 's',
                $confidence
            ),
        ];
    }

    /** @return array<string, mixed> */
    private function registry(): array
    {
        $file = (string) config('services.toll_matrix.node_file');
        if (! is_file($file)) {
            throw new RuntimeException('The local toll-node registry is missing.');
        }

        return json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    }

    private function pointId(string $networkId, string $point): ?int
    {
        $network = collect($this->matrix->catalog()['networks'])->firstWhere('id', $networkId);
        $match = collect($network['points'] ?? [])->first(fn (array $candidate) => $this->normalize($candidate['name']) === $this->normalize($point));

        return isset($match['id']) ? (int) $match['id'] : null;
    }

    /** @param array<int, array{0: float|int, 1: float|int}> $geometry
     * @return array{0: float, 1: int}
     */
    private function closestRouteVertex(float $latitude, float $longitude, array $geometry): array
    {
        $closest = PHP_FLOAT_MAX;
        $closestIndex = 0;
        foreach ($geometry as $index => $coordinate) {
            $distance = $this->haversine($latitude, $longitude, (float) $coordinate[1], (float) $coordinate[0]);
            if ($distance < $closest) {
                $closest = $distance;
                $closestIndex = $index;
            }
        }

        return [$closest, $closestIndex];
    }

    private function haversine(float $latitudeA, float $longitudeA, float $latitudeB, float $longitudeB): float
    {
        $earthRadius = 6371.0088;
        $latitudeDelta = deg2rad($latitudeB - $latitudeA);
        $longitudeDelta = deg2rad($longitudeB - $longitudeA);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitudeA)) * cos(deg2rad($latitudeB)) * sin($longitudeDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function normalize(string $value): string
    {
        return strtolower((string) preg_replace('/[^a-z0-9]+/i', '', $value));
    }
}
