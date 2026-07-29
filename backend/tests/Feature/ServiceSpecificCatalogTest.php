<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceSpecificCatalogTest extends TestCase
{
    use RefreshDatabase;

    private User $salesUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salesUser = User::factory()->create(['role' => 'reservation_officer']);
    }

    public function test_private_tour_cannot_be_created_with_generic_fields_in_place_of_its_package_configuration(): void
    {
        $response = $this->actingAs($this->salesUser)->postJson('/api/v1/billing/services', [
            'name' => 'Baguio Family Escape',
            'category' => 'Package',
            'service_type' => 'private_tour',
            'price' => 18500,
            'adult_price' => 18500,
            'child_price' => 14000,

            // Legacy/generalized fields must not substitute for private-tour configuration.
            'description' => 'Three-day private tour from Manila to Baguio.',
            'max_pax' => 12,
            'fixed_date' => '2026-09-15',
            'fixed_departure_time' => '06:00',
            'fixed_arrival_datetime' => '2026-09-17 20:00',
            'tour_hours' => 72,
            'tour_kms' => 520,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'package_config',
                'package_config.destination',
                'package_config.duration_days',
                'package_config.minimum_pax',
                'package_config.maximum_pax',
                'package_config.default_itinerary',
            ]);

        $this->assertDatabaseMissing('services', [
            'name' => 'Baguio Family Escape',
            'service_type' => 'private_tour',
        ]);
    }

    public function test_complete_private_tour_configuration_is_accepted_and_persisted(): void
    {
        $packageConfig = [
            'destination' => 'Baguio City',
            'origin' => 'Quezon City',
            'duration_days' => 3,
            'duration_nights' => 2,
            'minimum_pax' => 4,
            'maximum_pax' => 12,
            'booking_lead_days' => 7,
            'route_distance_km' => 490,
            'estimated_diesel_liters' => 89.1,
            'estimated_diesel_cost' => 6103,
            'valid_from' => '2026-08-01',
            'valid_until' => '2026-12-15',
            'default_itinerary' => [
                'Day 1: Departure, city tour, and hotel check-in',
                'Day 2: Camp John Hay and cultural sites',
                'Day 3: Market visit and return to Quezon City',
            ],
        ];

        $response = $this->actingAs($this->salesUser)->postJson('/api/v1/billing/services', [
            'name' => 'Baguio Family Escape',
            'category' => 'Package',
            'service_type' => 'private_tour',
            'package_config' => $packageConfig,
            'price' => 18500,
            'adult_price' => 18500,
            'child_price' => 14000,
            'description' => 'A dedicated private-tour package.',
            'is_sales_catalog' => true,
            'inclusions' => 'Private vehicle, accommodation, breakfast',
            'exclusions' => 'Personal expenses',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.service_type', 'private_tour')
            ->assertJsonPath('data.package_config.destination', 'Baguio City')
            ->assertJsonPath('data.package_config.duration_days', 3)
            ->assertJsonPath('data.package_config.minimum_pax', 4)
            ->assertJsonPath('data.package_config.maximum_pax', 12)
            ->assertJsonPath('data.package_config.route_distance_km', 490)
            ->assertJsonPath('data.package_config.estimated_diesel_liters', 89.1)
            ->assertJsonPath('data.package_config.estimated_diesel_cost', 6103)
            ->assertJsonCount(3, 'data.package_config.default_itinerary');

        $service = Service::query()->where('name', 'Baguio Family Escape')->sole();

        $this->assertSame('private_tour', $service->service_type);
        $this->assertSame($packageConfig, $service->package_config);
        $this->assertSame('18500.00', $service->adult_price);
        $this->assertSame('14000.00', $service->child_price);
        $this->assertTrue($service->is_sales_catalog);
    }

    public function test_joiner_tour_cannot_be_created_without_both_passenger_rates(): void
    {
        $response = $this->actingAs($this->salesUser)->postJson('/api/v1/billing/services', [
            'name' => 'September Baguio Joiners',
            'category' => 'Joiner Package',
            'service_type' => 'joiner_tour',
            'price' => 4200,

            // These generic package/trip fields cannot replace the joiner's two rate classes.
            'child_discount' => 25,
            'max_pax' => 40,
            'fixed_date' => '2026-09-15',
            'fixed_departure_time' => '04:00',
            'fixed_arrival_datetime' => '2026-09-17 22:00',
            'package_config' => [
                'destination' => 'Baguio City',
                'duration_days' => 3,
                'minimum_pax' => 1,
                'maximum_pax' => 40,
                'default_itinerary' => ['Generic itinerary'],
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['adult_price', 'child_price']);

        $this->assertDatabaseMissing('services', [
            'name' => 'September Baguio Joiners',
            'service_type' => 'joiner_tour',
        ]);
    }

    public function test_update_joiner_tour(): void
    {
        $service = Service::create([
            'name' => 'Original Joiner Tour',
            'category' => 'Joiners',
            'service_type' => 'joiner_tour',
            'price' => 2000,
            'adult_price' => 2000,
            'child_price' => 1800,
            'is_active' => true,
            'is_sales_catalog' => true,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->salesUser)->putJson('/api/v1/billing/services/' . $service->id, [
            'name' => 'Baguio',
            'category' => 'Joiners',
            'service_type' => 'joiner_tour',
            'is_sales_catalog' => true,
            'description' => 'Baguio',
            'price' => 2500,
            'adult_price' => 2500,
            'child_price' => 2250,
            'has_booking_fields' => true,
            'is_tour' => false,
            'inclusions' => '',
            'exclusions' => '',
            'package_config' => [
                'destination' => 'Baguio',
                'default_itinerary' => [],
            ],
            'images' => ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        ]);

        $response->assertOk();
    }
}
