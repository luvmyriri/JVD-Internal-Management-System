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
            ->assertJsonPath('data.garage_location', 'Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila')
            ->assertJsonPath('data.garage_coordinates.latitude', 14.756338137188132)
            ->assertJsonPath('data.garage_coordinates.longitude', 121.04179034232897)
            ->assertJsonPath('data.garage_distance_km', 12)
            ->assertJsonPath('data.route_distance_km', 245)
            ->assertJsonPath('data.total_distance_km', 257)
            ->assertJsonPath('data.toll_source.provider', 'Toll Regulatory Board')
            ->assertJsonPath('data.toll_source.mode', 'manual_reference');

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/search'));
    }

    public function test_route_estimate_can_exclude_the_garage_leg(): void
    {
        Http::fake([
            '*router.project-osrm.org/route/v1/driving/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 245000,
                    'legs' => [['distance' => 245000]],
                    'geometry' => ['coordinates' => [[121.0, 14.55], [120.59, 16.4]]],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())->postJson('/api/v1/sales/charter-route-estimate', [
            'pickup_location' => 'Exact Manila Pickup',
            'destination' => 'Exact Baguio Destination',
            'pickup_coordinates' => ['latitude' => 14.55, 'longitude' => 121.0],
            'destination_coordinates' => ['latitude' => 16.4, 'longitude' => 120.59],
            'include_garage' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.garage_distance_km', 0)
            ->assertJsonPath('data.route_distance_km', 245)
            ->assertJsonPath('data.total_distance_km', 245)
            ->assertJsonPath('data.garage_coordinates', null);
    }

    public function test_round_trip_routes_ordered_stops_and_both_garage_legs(): void
    {
        Http::fake([
            '*router.project-osrm.org/route/v1/driving/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 160000,
                    'legs' => collect([10000, 20000, 30000, 40000, 50000, 10000])->map(fn (int $distance) => [
                        'distance' => $distance,
                        'steps' => [],
                    ])->all(),
                    'geometry' => ['coordinates' => [[121.04179, 14.75633], [121.0, 14.55], [120.9, 15.0], [120.59, 16.4]]],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())->postJson('/api/v1/sales/charter-route-estimate', [
            'pickup_location' => 'Passenger pickup',
            'destination' => 'Main destination',
            'pickup_coordinates' => ['latitude' => 14.55, 'longitude' => 121.0],
            'destination_coordinates' => ['latitude' => 16.4, 'longitude' => 120.59],
            'include_garage' => true,
            'trip_type' => 'round_trip',
            'outbound_stops' => [[
                'label' => 'Outbound meal stop', 'latitude' => 15.0, 'longitude' => 120.9,
            ]],
            'return_stops' => [[
                'label' => 'Different return stop', 'latitude' => 15.2, 'longitude' => 120.8,
            ]],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.trip_type', 'round_trip')
            ->assertJsonPath('data.returns_to_garage', true)
            ->assertJsonPath('data.garage_outbound_distance_km', 10)
            ->assertJsonPath('data.outbound_distance_km', 50)
            ->assertJsonPath('data.return_distance_km', 90)
            ->assertJsonPath('data.garage_return_distance_km', 10)
            ->assertJsonPath('data.garage_distance_km', 20)
            ->assertJsonPath('data.route_distance_km', 140)
            ->assertJsonPath('data.total_distance_km', 160)
            ->assertJsonPath('data.outbound_stops.0.label', 'Outbound meal stop')
            ->assertJsonPath('data.return_stops.0.label', 'Different return stop')
            ->assertJsonPath('data.route_legs.5.to', 'Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila');

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/search'));
    }

    public function test_round_trip_prices_outbound_and_return_toll_passages(): void
    {
        $balintawak = [121.00044, 14.6793];
        $bocaue = [120.9395155, 14.8071119];
        Http::fake([
            '*router.project-osrm.org/route/v1/driving/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 72000,
                    'legs' => [
                        ['distance' => 36000, 'steps' => [['geometry' => ['coordinates' => [$balintawak, $bocaue]]]]],
                        ['distance' => 36000, 'steps' => [['geometry' => ['coordinates' => [$bocaue, $balintawak]]]]],
                    ],
                    'geometry' => ['coordinates' => [$balintawak, $bocaue, $balintawak]],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())->postJson('/api/v1/sales/charter-route-estimate', [
            'pickup_location' => 'Balintawak',
            'destination' => 'Bocaue',
            'pickup_coordinates' => ['latitude' => $balintawak[1], 'longitude' => $balintawak[0]],
            'destination_coordinates' => ['latitude' => $bocaue[1], 'longitude' => $bocaue[0]],
            'include_garage' => false,
            'trip_type' => 'round_trip',
            'vehicle_class' => 'bus',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.outbound_distance_km', 36)
            ->assertJsonPath('data.return_distance_km', 36)
            ->assertJsonPath('data.total_distance_km', 72)
            ->assertJsonPath('data.toll_estimate.mode', 'automatic_matrix')
            ->assertJsonPath('data.toll_estimate.easytrip', 526)
            ->assertJsonPath('data.toll_estimate.total', 526)
            ->assertJsonCount(2, 'data.toll_estimate.segments');
    }

    public function test_route_estimate_uses_the_local_matrix_when_toll_nodes_match(): void
    {
        Http::fake([
            '*router.project-osrm.org/route/v1/driving/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 36000,
                    'legs' => [['distance' => 36000]],
                    'geometry' => ['coordinates' => [[121.00044, 14.6793], [120.9395155, 14.8071119]]],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->superAdmin()->create())->postJson('/api/v1/sales/charter-route-estimate', [
            'pickup_location' => 'Balintawak',
            'destination' => 'Bocaue',
            'pickup_coordinates' => ['latitude' => 14.6793, 'longitude' => 121.00044],
            'destination_coordinates' => ['latitude' => 14.8071119, 'longitude' => 120.9395155],
            'include_garage' => false,
            'vehicle_class' => 'bus',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.toll_estimate.mode', 'automatic_matrix')
            ->assertJsonPath('data.toll_estimate.provider', 'JVD local Class 2 toll matrix')
            ->assertJsonPath('data.toll_estimate.easytrip', 263)
            ->assertJsonPath('data.toll_estimate.total', 263)
            ->assertJsonPath('data.toll_estimate.segments.0.entry_point', 'Balintawak')
            ->assertJsonPath('data.toll_estimate.segments.0.exit_point', 'Bocaue');
    }

    public function test_map_pin_reverse_geocoding_returns_a_searchable_address(): void
    {
        Http::fake(['*nominatim.openstreetmap.org/reverse*' => Http::response([
            'display_name' => 'SM City North EDSA, Quezon City, Metro Manila, Philippines',
        ])]);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->getJson('/api/v1/sales/reverse-location?latitude=14.6568&longitude=121.0293')
            ->assertOk()
            ->assertJsonPath('data.label', 'SM City North EDSA, Quezon City, Metro Manila, Philippines')
            ->assertJsonPath('data.latitude', 14.6568)
            ->assertJsonPath('data.longitude', 121.0293);
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

    public function test_known_landmark_search_does_not_wait_for_an_external_geocoder(): void
    {
        Http::fake();

        $this->actingAs(User::factory()->superAdmin()->create())
            ->getJson('/api/v1/sales/location-search?q=Tagaytay%20City')
            ->assertOk()
            ->assertJsonPath('data.0.label', 'Tagaytay City, Cavite')
            ->assertJsonPath('data.0.provider', 'JVD Landmarks Directory');

        Http::assertNothingSent();
    }

    public function test_official_location_search_uses_psgc_reference_data(): void
    {
        config(['services.psgc.token' => 'test-token']);
        Http::fake(['*classification.psa.gov.ph/psgc/*' => Http::response([
            ['psgc_code' => '1376020000', 'area_name' => 'City of Caloocan', 'geographic_level' => 'City', 'version' => 'Q2_2024'],
            ['psgc_code' => '1411020000', 'area_name' => 'City of Baguio', 'geographic_level' => 'City', 'version' => 'Q2_2024'],
        ])]);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->getJson('/api/v1/sales/official-location-search?q=Baguio')
            ->assertOk()
            ->assertJsonPath('data.0.label', 'City of Baguio')
            ->assertJsonPath('data.0.psgc_code', '1411020000')
            ->assertJsonPath('data.0.provider', 'Philippine Statistics Authority PSGC');
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
            'pricing_metadata' => [
                'toll_pricing_mode' => 'matrix',
                'include_garage_travel' => true,
                'toll_segments' => [[
                    'network_id' => 'TPLEX',
                    'network' => 'TPLEX',
                    'entry_point' => 'La Paz',
                    'exit_point' => 'Victoria',
                    'rfid' => 'autosweep',
                    'fee' => 76,
                ]],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.base_price', '24500.00')
            ->assertJsonPath('data.total_expenses', '12500.00')
            ->assertJsonPath('data.projected_profit', '12000.00')
            ->assertJsonPath('data.pricing_metadata.toll_pricing_mode', 'matrix')
            ->assertJsonPath('data.pricing_metadata.include_garage_travel', true)
            ->assertJsonPath('data.pricing_metadata.toll_segments.0.fee', 76);
        $this->assertDatabaseHas('charter_rate_plans', ['id' => $response->json('data.id'), 'base_price' => 24500]);
    }
}
