<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class PsgcService
{
    public function search(string $query, int $limit = 8): array
    {
        if (! config('services.psgc.token')) {
            return [];
        }

        $needle = mb_strtolower(trim($query));
        if (mb_strlen($needle) < 3) {
            return [];
        }

        $areas = collect($this->areas('municipalities'))->merge($this->areas('provinces'));

        return $areas
            ->filter(fn (array $area) => str_contains(mb_strtolower((string) ($area['area_name'] ?? '')), $needle))
            ->sortBy(fn (array $area) => mb_strtolower((string) ($area['area_name'] ?? '')) === $needle ? 0 : 1)
            ->take($limit)
            ->map(fn (array $area) => [
                'label' => $area['area_name'],
                'psgc_code' => $area['psgc_code'] ?? null,
                'geographic_level' => $area['geographic_level'] ?? null,
                'version' => $area['version'] ?? config('services.psgc.version'),
                'provider' => 'Philippine Statistics Authority PSGC',
            ])->values()->all();
    }

    private function areas(string $level): array
    {
        $version = config('services.psgc.version', 'Q2_2024');

        return Cache::remember("psgc:{$version}:{$level}", now()->addDay(), function () use ($level, $version) {
            try {
                $payload = Http::timeout(25)->get(
                    rtrim(config('services.psgc.base_url'), '/')."/{$version}/{$level}",
                    ['token' => config('services.psgc.token'), 'page_size' => 5000]
                )->throw()->json();
            } catch (Throwable) {
                return [];
            }

            if (array_is_list($payload)) {
                return $payload;
            }

            return $payload['data'] ?? $payload['results'] ?? [];
        });
    }
}
