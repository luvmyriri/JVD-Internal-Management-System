<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

class RouteEstimateService
{
    private const LANDMARKS = [
        'sm mall of asia' => ['label' => 'SM Mall of Asia, Pasay City, Metro Manila', 'latitude' => 14.5353, 'longitude' => 120.9822],
        'moa' => ['label' => 'SM Mall of Asia, Pasay City, Metro Manila', 'latitude' => 14.5353, 'longitude' => 120.9822],
        'sm megamall' => ['label' => 'SM Megamall, Mandaluyong City, Metro Manila', 'latitude' => 14.5843, 'longitude' => 121.0568],
        'sm north edsa' => ['label' => 'SM North EDSA, Quezon City, Metro Manila', 'latitude' => 14.6565, 'longitude' => 121.0287],
        'naia terminal 3' => ['label' => 'Ninoy Aquino International Airport Terminal 3, Pasay City', 'latitude' => 14.5204, 'longitude' => 121.0152],
        'naia terminal 1' => ['label' => 'Ninoy Aquino International Airport Terminal 1, Parañaque City', 'latitude' => 14.5088, 'longitude' => 121.0003],
        'naia' => ['label' => 'Ninoy Aquino International Airport, Pasay City', 'latitude' => 14.5204, 'longitude' => 121.0152],
        'rizal park' => ['label' => 'Rizal Park (Luneta), Manila', 'latitude' => 14.5831, 'longitude' => 120.9794],
        'luneta' => ['label' => 'Rizal Park (Luneta), Manila', 'latitude' => 14.5831, 'longitude' => 120.9794],
        'intramuros' => ['label' => 'Intramuros, Manila', 'latitude' => 14.5898, 'longitude' => 120.9747],
        'manila city hall' => ['label' => 'Manila City Hall, Ermita, Manila', 'latitude' => 14.5895, 'longitude' => 120.9818],
        'quezon city hall' => ['label' => 'Quezon City Hall, Diliman, Quezon City', 'latitude' => 14.6469, 'longitude' => 121.0494],
        'baguio city' => ['label' => 'Baguio City, Benguet', 'latitude' => 16.4023, 'longitude' => 120.5960],
        'baguio' => ['label' => 'Baguio City, Benguet', 'latitude' => 16.4023, 'longitude' => 120.5960],
        'tagaytay city' => ['label' => 'Tagaytay City, Cavite', 'latitude' => 14.1153, 'longitude' => 120.9621],
        'tagaytay' => ['label' => 'Tagaytay City, Cavite', 'latitude' => 14.1153, 'longitude' => 120.9621],
        'clark' => ['label' => 'Clark Freeport Zone, Pampanga', 'latitude' => 15.1856, 'longitude' => 120.5487],
        'subic bay' => ['label' => 'Subic Bay Freeport Zone, Zambales', 'latitude' => 14.8219, 'longitude' => 120.2789],
        'subic' => ['label' => 'Subic Bay Freeport Zone, Zambales', 'latitude' => 14.8219, 'longitude' => 120.2789],
        'batangas port' => ['label' => 'Batangas Port, Batangas City', 'latitude' => 13.7565, 'longitude' => 121.0447],
        'batangas city' => ['label' => 'Batangas City, Batangas', 'latitude' => 13.7565, 'longitude' => 121.0583],
        'vigan city' => ['label' => 'Vigan City, Ilocos Sur', 'latitude' => 17.5747, 'longitude' => 120.3869],
        'vigan' => ['label' => 'Vigan City, Ilocos Sur', 'latitude' => 17.5747, 'longitude' => 120.3869],
        'laoag city' => ['label' => 'Laoag City, Ilocos Norte', 'latitude' => 18.1960, 'longitude' => 120.5927],
        'laoag' => ['label' => 'Laoag City, Ilocos Norte', 'latitude' => 18.1960, 'longitude' => 120.5927],
        'hundred islands' => ['label' => 'Hundred Islands National Park, Alaminos, Pangasinan', 'latitude' => 16.2052, 'longitude' => 120.0381],
        'alaminos' => ['label' => 'Alaminos City, Pangasinan', 'latitude' => 16.1561, 'longitude' => 119.9814],
        'sagada' => ['label' => 'Sagada, Mountain Province', 'latitude' => 17.0833, 'longitude' => 120.9000],
        'banaue' => ['label' => 'Banaue, Ifugao', 'latitude' => 16.9117, 'longitude' => 121.0583],
        'san juan la union' => ['label' => 'San Juan, La Union', 'latitude' => 16.6698, 'longitude' => 120.3209],
        'la union' => ['label' => 'San Fernando, La Union', 'latitude' => 16.6159, 'longitude' => 120.3209],
        'bolinao' => ['label' => 'Bolinao, Pangasinan', 'latitude' => 16.3887, 'longitude' => 119.8931],
        'balanga' => ['label' => 'Balanga City, Bataan', 'latitude' => 14.6760, 'longitude' => 120.5367],
        'bataan' => ['label' => 'Balanga City, Bataan', 'latitude' => 14.6760, 'longitude' => 120.5367],
        'malolos' => ['label' => 'Malolos City, Bulacan', 'latitude' => 14.8527, 'longitude' => 120.8160],
        'bulacan' => ['label' => 'Malolos City, Bulacan', 'latitude' => 14.8527, 'longitude' => 120.8160],
        'caloocan' => ['label' => 'Caloocan City, Metro Manila', 'latitude' => 14.756338, 'longitude' => 121.041790],
    ];

    public function __construct(
        private readonly TollEstimateService $tolls,
        private readonly LocalTollRouteMatcher $localTolls,
    ) {}

    public function search(string $query): array
    {
        $normalized = mb_strtolower(trim($query));
        $matches = [];

        foreach (self::LANDMARKS as $key => $landmark) {
            if ($key === $normalized || str_contains($normalized, $key) || str_contains(mb_strtolower($landmark['label']), $normalized)) {
                $matches[] = [
                    'label' => $landmark['label'],
                    'latitude' => (float) $landmark['latitude'],
                    'longitude' => (float) $landmark['longitude'],
                    'provider' => 'JVD Landmarks Directory',
                ];
            }
        }

        // Known operating landmarks are authoritative enough for quoting and must
        // remain usable even when third-party geocoders are slow or unavailable.
        if ($matches !== []) {
            return array_values(collect($matches)->unique('label')->take(8)->all());
        }

        $cacheKey = 'charter-location-search:'.hash('sha256', $normalized);
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && $cached !== []) {
            return $cached;
        }

        $googleKey = config('services.maps.google_geocoding_key');
        if ($googleKey) {
            try {
                $response = Http::connectTimeout(2)->timeout(4)->get('https://maps.googleapis.com/maps/api/geocode/json', [
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
                    $results = array_values(collect($results)->unique('label')->take(8)->all());
                    Cache::put($cacheKey, $results, now()->addDay());

                    return $results;
                }
            } catch (Throwable) {
                // Continue with the key-free provider when Google is unavailable.
            }
        }

        try {
            $response = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
                ->connectTimeout(2)
                ->timeout(4)
                ->get(rtrim(config('services.maps.geocoder_url'), '/').'/search', [
                    'q' => $query,
                    'format' => 'jsonv2',
                    'countrycodes' => 'ph',
                    'addressdetails' => 1,
                    'limit' => 8,
                ])->throw()->json();

            $nominatimResults = collect($response)->map(fn (array $result) => [
                'label' => $result['display_name'],
                'latitude' => (float) $result['lat'],
                'longitude' => (float) $result['lon'],
                'provider' => 'OpenStreetMap Nominatim',
            ])->values()->all();

            $nominatimResults = array_values(collect($nominatimResults)->unique('label')->take(8)->all());
            if ($nominatimResults !== []) {
                Cache::put($cacheKey, $nominatimResults, now()->addDay());
            }

            return $nominatimResults;
        } catch (Throwable) {
            // Never invent coordinates for an unknown address: staff can refine the
            // search or place an exact pin without corrupting distance-based pricing.
            return [];
        }
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
        $selected = null;
        try {
            $route = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
                ->connectTimeout(2)
                ->timeout(8)
                ->get(rtrim(config('services.maps.router_url'), '/')."/route/v1/driving/{$coordinates}", [
                    'overview' => 'full',
                    'geometries' => 'geojson',
                    'steps' => 'true',
                ])->throw()->json();

            if (($route['code'] ?? null) === 'Ok' && ! empty($route['routes'][0])) {
                $selected = $route['routes'][0];
            }
        } catch (Throwable) {
            $selected = null;
        }

        if (! $selected) {
            $selected = $this->buildFallbackRoute($points);
        }

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
                $response = Http::connectTimeout(2)->timeout(4)->get('https://maps.googleapis.com/maps/api/geocode/json', [
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
            ->connectTimeout(2)
            ->timeout(4)
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

    private function buildFallbackRoute(array $points): array
    {
        $legs = [];
        $totalDistanceMeters = 0;
        $allCoordinates = [];

        for ($i = 0; $i < count($points) - 1; $i++) {
            $p1 = $points[$i];
            $p2 = $points[$i + 1];
            $distanceKm = $this->haversineDistance($p1['latitude'], $p1['longitude'], $p2['latitude'], $p2['longitude']) * 1.35;
            $distanceMeters = round($distanceKm * 1000);
            $totalDistanceMeters += $distanceMeters;

            // Generate intermediate interpolated coordinates for smooth polyline
            $stepCoords = [
                [$p1['longitude'], $p1['latitude']],
                [
                    round(($p1['longitude'] + $p2['longitude']) / 2, 6),
                    round(($p1['latitude'] + $p2['latitude']) / 2, 6),
                ],
                [$p2['longitude'], $p2['latitude']],
            ];

            $legs[] = [
                'distance' => $distanceMeters,
                'duration' => round($distanceKm * 75), // ~45-50 km/h average bus travel speed
                'steps' => [
                    [
                        'geometry' => [
                            'coordinates' => $stepCoords,
                        ],
                    ],
                ],
            ];

            $allCoordinates = array_merge($allCoordinates, $stepCoords);
        }

        return [
            'distance' => $totalDistanceMeters,
            'legs' => $legs,
            'geometry' => [
                'coordinates' => $allCoordinates ?: [[120.9842, 14.5995], [121.0418, 14.7563]],
            ],
        ];
    }

    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
