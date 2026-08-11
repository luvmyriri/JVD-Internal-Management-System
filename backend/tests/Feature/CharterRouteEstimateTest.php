<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CharterRouteEstimateTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_estimate_includes_the_garage_leg_and_official_toll_reference(): void
    {
        Http::fake([
            '*nominatim.openstreetmap.org/search*' => Http::response([[
                'display_name' => 'Q24R+FP Caloocan, Metro Manila, Philippines',
                'lat' => '14.6500', 'lon' => '120.9700',
            ]]),
            '*router.project-osrm.org/route/v1/driving/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 257000,
                    'legs' => [['distance' => 12000], ['distance' => 245000]],
                    'geometry' => ['coordinates' => [[120.97, 14.65], [121.0, 14.55], [120.59, 16.4]]],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())->postJson('/api/v1/sales/charter-route-estimate', [
            'pickup_location' => 'Exact Manila Pickup',
            'destination' => 'Exact Baguio Destination',
            'pickup_coordinates' => ['latitude' => 14.55, 'longitude' => 121.0],
            'destination_coordinates' => ['latitude' => 16.4, 'longitude' => 120.59],
            'include_garage' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.garage_distance_km', 12)
            ->assertJsonPath('data.route_distance_km', 245)
            ->assertJsonPath('data.total_distance_km', 257)
            ->assertJsonPath('data.toll_source.provider', 'Toll Regulatory Board')
            ->assertJsonPath('data.toll_source.mode', 'manual_reference');
    }

    public function test_location_search_returns_the_full_specific_address(): void
    {
        Http::fake(['*nominatim.openstreetmap.org/search*' => Http::response([[
            'display_name' => 'Ayala Triangle Gardens, Makati Avenue, Makati, Metro Manila, Philippines',
            'lat' => '14.5567', 'lon' => '121.0233',
        ]])]);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->getJson('/api/v1/sales/location-search?q=Ayala%20Triangle%20Gardens')
            ->assertOk()
            ->assertJsonPath('data.0.label', 'Ayala Triangle Gardens, Makati Avenue, Makati, Metro Manila, Philippines');
    }

    public function test_rate_plan_api_persists_the_server_computed_profit_lock(): void
    {
        $user = User::factory()->superAdmin()->create();
        $service = Service::create([
            'name' => 'Provincial Bus Charter',
            'category' => 'Transport',
            'price' => 0,
            'is_active' => true,
            'is_sales_catalog' => true,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/sales/charter-rate-plans', [
            'service_id' => $service->id,
            'name' => 'Manila to Baguio',
            'vehicle_class' => 'bus',
            'base_price' => 20000,
            'included_hours' => 12,
            'included_kilometers' => 250,
            'extra_hour_rate' => 0,
            'extra_kilometer_rate' => 0,
            'overnight_rate' => 0,
            'includes_driver' => true,
            'includes_fuel' => true,
            'includes_tolls' => true,
            'includes_parking' => false,
            'total_distance_km' => 250,
            'fuel_efficiency_km_per_liter' => 2.5,
            'diesel_price_per_liter' => 60,
            'driver_meals' => 1500,
            'toll_gate_fees' => 1000,
            'easytrip' => 500,
            'autosweep' => 500,
            'commission' => 3000,
            'desired_profit' => 12000,
            'auto_adjust_rate' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.base_price', '24500.00')
            ->assertJsonPath('data.total_expenses', '12500.00')
            ->assertJsonPath('data.projected_profit', '12000.00');
        $this->assertDatabaseHas('charter_rate_plans', ['id' => $response->json('data.id'), 'base_price' => 24500]);
    }
}
