<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

class RouteEstimateService
{
    public function __construct(
        private readonly TollEstimateService $tolls,
        private readonly LocalTollRouteMatcher $localTolls,
    ) {}

    public function search(string $query): array
    {
        $googleKey = config('services.maps.google_geocoding_key');
        if ($googleKey) {
            try {
                $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'address' => $query,
                    'region' => 'ph',
                    'key' => $googleKey,
                ])->throw()->json();
                $results = collect($response['results'] ?? [])->take(8)->map(fn (array $result) => [
                    'label' => $result['formatted_address'],
                    'latitude' => (float) $result['geometry']['location']['lat'],
                    'longitude' => (float) $result['geometry']['location']['lng'],
                    'provider' => 'Google Maps',
                ])->values()->all();
                if ($results !== []) {
                    return $results;
                }
            } catch (Throwable) {
                // Continue with the key-free provider when Google is unavailable.
            }
        }

        $response = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
            ->timeout(12)
            ->get(rtrim(config('services.maps.geocoder_url'), '/').'/search', [
                'q' => $query,
                'format' => 'jsonv2',
                'countrycodes' => 'ph',
                'addressdetails' => 1,
                'limit' => 8,
            ])->throw()->json();

        return collect($response)->map(fn (array $result) => [
            'label' => $result['display_name'],
            'latitude' => (float) $result['lat'],
            'longitude' => (float) $result['lon'],
            'provider' => 'OpenStreetMap Nominatim',
        ])->values()->all();
    }

    public function estimate(array $data): array
    {
        $includeGarage = (bool) ($data['include_garage'] ?? true);
        $tripType = $data['trip_type'] ?? 'one_way';
        $garageLocation = $data['garage_location'] ?? config('services.maps.garage_location');
        $pickup = $this->resolve($data['pickup_location'], $data['pickup_coordinates'] ?? null);
        $destination = $this->resolve($data['destination'], $data['destination_coordinates'] ?? null);
        $garage = $includeGarage ? $this->resolve($garageLocation, $data['garage_coordinates'] ?? $this->configuredGarageCoordinates()) : null;
        $outboundStops = $this->resolveStops($data['outbound_stops'] ?? []);
        $customReturnStops = $this->resolveStops($data['return_stops'] ?? []);
        $returnStops = $tripType === 'round_trip'
            ? ($customReturnStops !== [] ? $customReturnStops : array_reverse($outboundStops))
            : [];

        $outboundPoints = [$pickup, ...$outboundStops, $destination];
        $returnPoints = $tripType === 'round_trip' ? [$destination, ...$returnStops, $pickup] : [];
        $points = $includeGarage ? [$garage, ...$outboundPoints] : $outboundPoints;
        if ($tripType === 'round_trip') {
            $points = [...$points, ...array_slice($returnPoints, 1)];
            if ($includeGarage) {
                $points[] = $garage;
            }
        }
        $coordinates = collect($points)->map(fn (array $point) => "{$point['longitude']},{$point['latitude']}")->implode(';');

        $route = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
            ->timeout(20)
            ->get(rtrim(config('services.maps.router_url'), '/')."/route/v1/driving/{$coordinates}", [
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'true',
            ])->throw()->json();

        if (($route['code'] ?? null) !== 'Ok' || empty($route['routes'][0])) {
            throw ValidationException::withMessages(['route' => 'No drivable route was found for the selected locations.']);
        }

        $selected = $route['routes'][0];
        $legs = $selected['legs'] ?? [];
        $cursor = 0;
        $garageOutboundLegs = $includeGarage ? 1 : 0;
        $garageOutboundDistance = $this->sumLegDistance($legs, $cursor, $garageOutboundLegs);
        $cursor += $garageOutboundLegs;
        $outboundLegs = count($outboundPoints) - 1;
        $outboundDistance = $this->sumLegDistance($legs, $cursor, $outboundLegs);
        $outboundGeometry = $this->legGeometry($legs, $cursor, $outboundLegs);
        $cursor += $outboundLegs;
        $returnLegs = $tripType === 'round_trip' ? count($returnPoints) - 1 : 0;
        $returnDistance = $this->sumLegDistance($legs, $cursor, $returnLegs);
        $returnGeometry = $this->legGeometry($legs, $cursor, $returnLegs);
        $cursor += $returnLegs;
        $garageReturnLegs = $includeGarage && $tripType === 'round_trip' ? 1 : 0;
        $garageReturnDistance = $this->sumLegDistance($legs, $cursor, $garageReturnLegs);
        $garageDistance = $garageOutboundDistance + $garageReturnDistance;
        $routeDistance = $outboundDistance + $returnDistance;
        $phaseGeometries = array_values(array_filter([
            $this->legGeometry($legs, 0, $garageOutboundLegs),
            $outboundGeometry,
            $returnGeometry,
            $this->legGeometry($legs, $cursor, $garageReturnLegs),
        ]));
        if ($phaseGeometries === []) {
            $phaseGeometries[] = $selected['geometry']['coordinates'] ?? [];
        }

        $vehicleClass = $data['vehicle_class'] ?? 'bus';
        try {
            $tollEstimate = in_array($vehicleClass, ['bus', 'coaster'], true)
                ? $this->mergeLocalTollEstimates($phaseGeometries)
                : null;
        } catch (Throwable) {
            $tollEstimate = null;
        }
        $tollEstimate ??= $this->tolls->estimate($points, $vehicleClass);

        return [
            'garage_location' => $garageLocation,
            'pickup_location' => $pickup['label'],
            'destination' => $destination['label'],
            'trip_type' => $tripType,
            'outbound_stops' => $outboundStops,
            'return_stops' => $customReturnStops,
            'effective_return_stops' => $returnStops,
            'returns_to_garage' => $tripType === 'round_trip' && $includeGarage,
            'garage_outbound_distance_km' => round($garageOutboundDistance, 2),
            'outbound_distance_km' => round($outboundDistance, 2),
            'return_distance_km' => round($returnDistance, 2),
            'garage_return_distance_km' => round($garageReturnDistance, 2),
            'garage_distance_km' => round($garageDistance, 2),
            'route_distance_km' => round($routeDistance, 2),
            'total_distance_km' => round((float) $selected['distance'] / 1000, 2),
            'garage_coordinates' => $garage,
            'pickup_coordinates' => $pickup,
            'destination_coordinates' => $destination,
            'route_legs' => collect($legs)->map(fn (array $leg, int $index) => [
                'from' => $points[$index]['label'],
                'to' => $points[$index + 1]['label'],
                'distance_km' => round((float) ($leg['distance'] ?? 0) / 1000, 2),
            ])->values()->all(),
            'geometry' => $selected['geometry']['coordinates'] ?? [],
            'routing_provider' => 'OSRM',
            'geocoding_provider' => $pickup['provider'],
            'toll_estimate' => $tollEstimate,
            'toll_source' => $tollEstimate,
        ];
    }

    /** @param array<int, array<string, mixed>> $stops */
    private function resolveStops(array $stops): array
    {
        return collect($stops)->map(fn (array $stop) => $this->resolve($stop['label'], isset($stop['latitude'], $stop['longitude']) ? [
            'latitude' => $stop['latitude'],
            'longitude' => $stop['longitude'],
        ] : null))->values()->all();
    }

    private function sumLegDistance(array $legs, int $start, int $count): float
    {
        return collect(array_slice($legs, $start, $count))->sum(fn (array $leg) => (float) ($leg['distance'] ?? 0)) / 1000;
    }

    /** @return array<int, array{0: float|int, 1: float|int}> */
    private function legGeometry(array $legs, int $start, int $count): array
    {
        if ($count === 0) {
            return [];
        }

        return collect(array_slice($legs, $start, $count))
            ->flatMap(fn (array $leg) => collect($leg['steps'] ?? [])->flatMap(fn (array $step) => $step['geometry']['coordinates'] ?? []))
            ->values()->all();
    }

    /** @param array<int, array<int, array{0: float|int, 1: float|int}>> $phaseGeometries */
    private function mergeLocalTollEstimates(array $phaseGeometries): ?array
    {
        $estimates = collect($phaseGeometries)
            ->map(fn (array $geometry) => count($geometry) >= 2 ? $this->localTolls->estimate($geometry) : null)
            ->filter()
            ->values();
        if ($estimates->isEmpty()) {
            return null;
        }

        $confidenceOrder = ['high' => 0, 'medium' => 1, 'review' => 2];
        $confidence = $estimates->sortByDesc(fn (array $estimate) => $confidenceOrder[$estimate['confidence'] ?? 'review'])->first()['confidence'] ?? 'review';
        $segments = $estimates->flatMap(fn (array $estimate) => $estimate['segments'] ?? [])->values()->all();
        $tolls = $estimates->flatMap(fn (array $estimate) => $estimate['tolls'] ?? [])->values()->all();
        $totals = [
            'toll_gate_fees' => round((float) $estimates->sum('toll_gate_fees'), 2),
            'easytrip' => round((float) $estimates->sum('easytrip'), 2),
            'autosweep' => round((float) $estimates->sum('autosweep'), 2),
        ];

        return [
            'provider' => 'JVD local Class 2 toll matrix',
            'mode' => 'automatic_matrix',
            'currency' => 'PHP',
            'vehicle_type' => 'Class 2 bus',
            ...$totals,
            'total' => round(array_sum($totals), 2),
            'tolls' => $tolls,
            'segments' => $segments,
            'confidence' => $confidence,
            'matched_node_distance_km' => round((float) $estimates->max('matched_node_distance_km'), 3),
            'url' => $estimates->first()['url'],
            'message' => sprintf(
                'Automatically priced %d toll passage%s across the complete operating itinerary. Values remain editable.',
                count($segments),
                count($segments) === 1 ? '' : 's'
            ),
        ];
    }

    public function reverse(float $latitude, float $longitude): array
    {
        $googleKey = config('services.maps.google_geocoding_key');
        if ($googleKey) {
            try {
                $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'latlng' => "{$latitude},{$longitude}",
                    'region' => 'ph',
                    'key' => $googleKey,
                ])->throw()->json();
                $result = $response['results'][0] ?? null;
                if ($result) {
                    return [
                        'label' => $result['formatted_address'],
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'provider' => 'Google Maps',
                    ];
                }
            } catch (Throwable) {
                // Continue with the key-free provider when Google is unavailable.
            }
        }

        $response = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
            ->timeout(12)
            ->get(rtrim(config('services.maps.geocoder_url'), '/').'/reverse', [
                'lat' => $latitude,
                'lon' => $longitude,
                'format' => 'jsonv2',
                'zoom' => 18,
                'addressdetails' => 1,
            ])->throw()->json();

        return [
            'label' => $response['display_name'] ?? sprintf('Pinned location (%.6f, %.6f)', $latitude, $longitude),
            'latitude' => $latitude,
            'longitude' => $longitude,
            'provider' => isset($response['display_name']) ? 'OpenStreetMap Nominatim' : 'Map pin',
        ];
    }

    private function resolve(string $label, ?array $coordinates): array
    {
        if ($coordinates && isset($coordinates['latitude'], $coordinates['longitude'])) {
            return [
                'label' => $label,
                'latitude' => (float) $coordinates['latitude'],
                'longitude' => (float) $coordinates['longitude'],
                'provider' => 'Provided coordinates',
            ];
        }

        $result = $this->search($label)[0] ?? null;
        if (! $result) {
            throw ValidationException::withMessages(['location' => "Could not find a Philippine location matching '{$label}'."]);
        }

        return $result;
    }

    private function configuredGarageCoordinates(): ?array
    {
        $latitude = config('services.maps.garage_latitude');
        $longitude = config('services.maps.garage_longitude');
        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }

        return ['latitude' => (float) $latitude, 'longitude' => (float) $longitude];
    }
}
