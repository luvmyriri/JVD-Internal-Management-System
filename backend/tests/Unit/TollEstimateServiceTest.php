<?php

namespace Tests\Unit;

use App\Services\TollEstimateService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TollEstimateServiceTest extends TestCase
{
    public function test_it_categorizes_philippine_bus_tolls_without_double_counting(): void
    {
        config(['services.tollguru.api_key' => 'test-key']);
        Http::fake(['*apis.tollguru.com/toll/v2/origin-destination-waypoints' => Http::response([
            'status' => 'OK',
            'summary' => ['currency' => 'PHP', 'vehicleType' => '2AxlesBus'],
            'routes' => [[
                'costs' => ['tag' => 500, 'minimumTollCost' => 500],
                'tolls' => [
                    ['name' => 'NLEX Balintawak', 'road' => 'NLEX', 'tagCost' => 200, 'currency' => 'PHP'],
                    ['name' => 'Skyway Stage 3', 'road' => 'Skyway', 'tagCost' => 250, 'currency' => 'PHP'],
                    ['name' => 'Local Toll', 'road' => 'Other', 'cashCost' => 50, 'currency' => 'PHP'],
                ],
            ]],
        ])]);

        $result = app(TollEstimateService::class)->estimate([
            ['latitude' => 14.65, 'longitude' => 120.97],
            ['latitude' => 14.55, 'longitude' => 121.00],
            ['latitude' => 16.40, 'longitude' => 120.59],
        ]);

        $this->assertSame('automatic', $result['mode']);
        $this->assertSame(200.0, $result['easytrip']);
        $this->assertSame(250.0, $result['autosweep']);
        $this->assertSame(50.0, $result['toll_gate_fees']);
        $this->assertSame(500.0, $result['total']);
        Http::assertSent(fn ($request) => $request->hasHeader('x-api-key', 'test-key')
            && $request['vehicle']['type'] === '2AxlesBus'
            && count($request['waypoints']) === 1
        );
    }

    public function test_it_returns_an_editable_manual_fallback_without_a_key(): void
    {
        config(['services.tollguru.api_key' => null]);

        $result = app(TollEstimateService::class)->estimate([
            ['latitude' => 14.65, 'longitude' => 120.97],
            ['latitude' => 16.40, 'longitude' => 120.59],
        ]);

        $this->assertSame('manual_reference', $result['mode']);
        $this->assertSame(0.0, $result['total']);
        Http::assertNothingSent();
    }
}
