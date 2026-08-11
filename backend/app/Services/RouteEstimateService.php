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
        $garageLocation = $data['garage_location'] ?? config('services.maps.garage_location');
        $pickup = $this->resolve($data['pickup_location'], $data['pickup_coordinates'] ?? null);
        $destination = $this->resolve($data['destination'], $data['destination_coordinates'] ?? null);
        $garage = $includeGarage ? $this->resolve($garageLocation, $data['garage_coordinates'] ?? $this->configuredGarageCoordinates()) : null;
        $points = array_values(array_filter([$garage, $pickup, $destination]));
        $coordinates = collect($points)->map(fn (array $point) => "{$point['longitude']},{$point['latitude']}")->implode(';');

        $route = Http::withHeaders(['User-Agent' => config('services.maps.user_agent')])
            ->timeout(20)
            ->get(rtrim(config('services.maps.router_url'), '/')."/route/v1/driving/{$coordinates}", [
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'false',
            ])->throw()->json();

        if (($route['code'] ?? null) !== 'Ok' || empty($route['routes'][0])) {
            throw ValidationException::withMessages(['route' => 'No drivable route was found for the selected locations.']);
        }

        $selected = $route['routes'][0];
        $legs = $selected['legs'] ?? [];
        $garageDistance = $includeGarage ? (($legs[0]['distance'] ?? 0) / 1000) : 0;
        $routeDistance = $includeGarage
            ? (($legs[1]['distance'] ?? 0) / 1000)
            : (($legs[0]['distance'] ?? 0) / 1000);

        $vehicleClass = $data['vehicle_class'] ?? 'bus';
        try {
            $tollEstimate = in_array($vehicleClass, ['bus', 'coaster'], true)
                ? $this->localTolls->estimate($selected['geometry']['coordinates'] ?? [])
                : null;
        } catch (Throwable) {
            $tollEstimate = null;
        }
        $tollEstimate ??= $this->tolls->estimate($points, $vehicleClass);

        return [
            'garage_location' => $garageLocation,
            'pickup_location' => $pickup['label'],
            'destination' => $destination['label'],
            'garage_distance_km' => round($garageDistance, 2),
            'route_distance_km' => round($routeDistance, 2),
            'total_distance_km' => round((float) $selected['distance'] / 1000, 2),
            'garage_coordinates' => $garage,
            'pickup_coordinates' => $pickup,
            'destination_coordinates' => $destination,
            'geometry' => $selected['geometry']['coordinates'] ?? [],
            'routing_provider' => 'OSRM',
            'geocoding_provider' => $pickup['provider'],
            'toll_estimate' => $tollEstimate,
            'toll_source' => $tollEstimate,
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
