<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class RouteEstimateService
{
    public function search(string $query): array
    {
        $googleKey = config('services.maps.google_geocoding_key');
        if ($googleKey) {
            $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $query,
                'region' => 'ph',
                'key' => $googleKey,
            ])->throw()->json();

            return collect($response['results'] ?? [])->take(8)->map(fn (array $result) => [
                'label' => $result['formatted_address'],
                'latitude' => (float) $result['geometry']['location']['lat'],
                'longitude' => (float) $result['geometry']['location']['lng'],
                'provider' => 'Google Maps',
            ])->values()->all();
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
        $garage = $includeGarage ? $this->resolve($garageLocation, $data['garage_coordinates'] ?? null) : null;
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
            'toll_source' => [
                'provider' => 'Toll Regulatory Board',
                'mode' => 'manual_reference',
                'url' => config('services.toll_regulatory_board.rates_url'),
                'message' => 'No documented live government toll-pricing API is available. Verify the editable toll values against the official TRB matrices.',
            ],
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
}
