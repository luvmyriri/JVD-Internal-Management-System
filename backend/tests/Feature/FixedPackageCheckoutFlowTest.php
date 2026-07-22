<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Invoice;
use App\Models\PrivateTourBooking;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class FixedPackageCheckoutFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_checkout_carries_private_package_party_into_invoice_fulfillment_and_logistics(): void
    {
        Mail::fake();
        Notification::fake();
        $agent = User::factory()->superAdmin()->create();
        $driver = User::factory()->create(['role' => 'driver', 'is_active' => true, 'phone' => '09171234567']);
        $bus = Bus::create([
            'plate_number' => 'FIXED-101',
            'model' => 'Tour Coach',
            'vehicle_type' => 'bus',
            'seating_capacity' => 49,
            'status' => 'available',
        ]);
        $service = Service::create([
            'name' => 'Bohol Family Escape',
            'description' => 'Three-day private family itinerary.',
            'category' => 'Package',
            'service_type' => 'private_tour',
            'package_config' => [
                'destination' => 'Bohol',
                'duration_days' => 3,
                'duration_nights' => 2,
                'minimum_pax' => 2,
                'maximum_pax' => 12,
                'booking_lead_days' => 7,
                'default_itinerary' => ['Arrival and countryside tour', 'Island tour', 'Departure'],
            ],
            'price' => 4000,
            'adult_price' => 4000,
            'child_price' => 3500,
            'is_sales_catalog' => true,
            'is_active' => true,
            'created_by' => $agent->id,
        ]);
        $start = now()->addMonths(2)->startOfDay();
        $end = $start->copy()->addDays(2)->endOfDay();

        $response = $this->actingAs($agent)->postJson('/api/v1/billing', [
            'customer_name' => 'Maria Santos',
            'customer_email' => 'maria.santos@example.test',
            'customer_contact' => '09179998888',
            'customer_address' => 'Quezon City',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 8400,
            'tax_rate' => 0.12,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'pax_count' => 2,
            'items' => [[
                'service_id' => $service->id,
                'item_name' => $service->name,
                'service_type' => 'private_tour',
                'item_description' => $service->description,
                'quantity' => 1,
                'unit_price' => 7500,
                'adults' => 1,
                'children' => 1,
                'adult_price' => 4000,
                'child_price' => 3500,
                'service_date' => $start->toIso8601String(),
                'destination' => 'Bohol',
                'item_metadata' => [
                    'package_name' => $service->name,
                    'destination' => 'Bohol',
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'passenger_count' => 2,
                    'pickup_location' => 'JVD Office',
                    'bus_id' => $bus->id,
                    'driver_id' => $driver->id,
                    'originating_catalog_service_id' => $service->id,
                    'adult_count' => 1,
                    'child_count' => 1,
                    'adult_rate' => 4000,
                    'child_rate' => 3500,
                    'traveler_types' => [
                        ['name' => 'Maria Santos', 'type' => 'adult'],
                        ['name' => 'Ana Santos', 'type' => 'child'],
                    ],
                    'itinerary' => [
                        ['day' => 1, 'title' => 'Bohol', 'description' => 'Arrival and countryside tour'],
                        ['day' => 2, 'title' => 'Panglao', 'description' => 'Island tour'],
                        ['day' => 3, 'title' => 'Bohol', 'description' => 'Departure'],
                    ],
                    'inclusions' => ['Private transport', 'Guide'],
                    'exclusions' => ['Personal expenses'],
                ],
            ]],
            'custom_transaction_detail' => [
                'category' => 'Private Tour',
                'destination' => 'Bohol',
            ],
            'itinerary' => [
                ['day_number' => 1, 'date' => $start->toDateString(), 'location' => 'Bohol', 'activity_description' => 'Arrival and countryside tour'],
                ['day_number' => 2, 'date' => $start->copy()->addDay()->toDateString(), 'location' => 'Panglao', 'activity_description' => 'Island tour'],
                ['day_number' => 3, 'date' => $start->copy()->addDays(2)->toDateString(), 'location' => 'Bohol', 'activity_description' => 'Departure'],
            ],
            'passengers' => [
                ['first_name' => 'Maria', 'last_name' => 'Santos'],
                ['first_name' => 'Ana', 'last_name' => 'Santos', 'date_of_birth' => now()->subYears(8)->toDateString()],
            ],
        ])->assertCreated();

        $invoice = Invoice::findOrFail($response->json('data.id'));
        $item = $invoice->items()->firstOrFail();
        $fulfillment = PrivateTourBooking::firstOrFail();

        $this->assertSame('Maria Santos', $invoice->customer_name);
        $this->assertSame(7500.0, (float) $invoice->subtotal);
        $this->assertSame(8400.0, (float) $invoice->total_amount);
        $this->assertSame(1, $item->adults);
        $this->assertSame(1, $item->children);
        $this->assertSame(4000.0, (float) $item->adult_price);
        $this->assertSame(3500.0, (float) $item->child_price);
        $this->assertSame($service->id, $fulfillment->originating_catalog_service_id);
        $this->assertSame(1, $fulfillment->adult_count);
        $this->assertSame(1, $fulfillment->child_count);
        $this->assertSame($bus->id, $fulfillment->bus_id);
        $this->assertSame($driver->id, $fulfillment->driver_id);
        $this->assertCount(2, $fulfillment->traveler_types);
        $this->assertDatabaseCount('invoice_passengers', 2);
        $this->assertDatabaseCount('bookings', 0);
        $this->assertDatabaseHas('sales_orders', ['invoice_id' => $invoice->id]);
        $this->assertDatabaseHas('resource_allocations', ['bus_id' => $bus->id, 'driver_id' => $driver->id, 'status' => 'confirmed']);
    }

    public function test_private_package_checkout_rejects_catalog_rule_bypasses(): void
    {
        Mail::fake();
        Notification::fake();
        $agent = User::factory()->superAdmin()->create();
        $service = $this->createPrivatePackage($agent);
        $otherService = $this->createPrivatePackage($agent, ['name' => 'Different Private Package']);
        $payload = $this->privatePackageCheckoutPayload($service);
        $start = now()->addMonths(2)->startOfDay();

        $tooManyTravelers = collect(range(1, 13))->map(fn (int $number) => [
            'name' => "Traveler {$number}",
            'type' => 'adult',
        ])->all();

        $attempts = [
            'missing originating package' => [
                ['items.0.item_metadata.originating_catalog_service_id' => null],
                'items.0.item_metadata.originating_catalog_service_id',
            ],
            'different originating package' => [
                ['items.0.item_metadata.originating_catalog_service_id' => $otherService->id],
                'items.0.item_metadata.originating_catalog_service_id',
            ],
            'spoofed package name' => [
                ['items.0.item_metadata.package_name' => 'Unapproved Package Name'],
                'items.0.item_metadata.package_name',
            ],
            'different destination' => [
                ['items.0.item_metadata.destination' => 'Cebu'],
                'items.0.item_metadata.destination',
            ],
            'different duration' => [
                ['items.0.item_metadata.ends_at' => $start->copy()->addDays(3)->endOfDay()->toIso8601String()],
                'items.0.item_metadata.ends_at',
            ],
            'insufficient lead time' => [
                [
                    'items.0.item_metadata.starts_at' => now()->addDays(2)->startOfDay()->toIso8601String(),
                    'items.0.item_metadata.ends_at' => now()->addDays(4)->endOfDay()->toIso8601String(),
                ],
                'items.0.item_metadata.starts_at',
            ],
            'departure after package validity' => [
                [
                    'items.0.item_metadata.starts_at' => now()->addMonths(8)->startOfDay()->toIso8601String(),
                    'items.0.item_metadata.ends_at' => now()->addMonths(8)->addDays(2)->endOfDay()->toIso8601String(),
                ],
                'items.0.item_metadata.starts_at',
            ],
            'party below minimum' => [
                [
                    'items.0.adults' => 1,
                    'items.0.children' => 0,
                    'items.0.item_metadata.passenger_count' => 1,
                    'items.0.item_metadata.adult_count' => 1,
                    'items.0.item_metadata.child_count' => 0,
                    'items.0.item_metadata.traveler_types' => [['name' => 'Maria Santos', 'type' => 'adult']],
                ],
                'items.0.item_metadata.passenger_count',
            ],
            'party above maximum' => [
                [
                    'items.0.adults' => 13,
                    'items.0.children' => 0,
                    'items.0.item_metadata.passenger_count' => 13,
                    'items.0.item_metadata.adult_count' => 13,
                    'items.0.item_metadata.child_count' => 0,
                    'items.0.item_metadata.traveler_types' => $tooManyTravelers,
                ],
                'items.0.item_metadata.passenger_count',
            ],
            'shortened itinerary' => [
                ['items.0.item_metadata.itinerary' => array_slice($payload['items'][0]['item_metadata']['itinerary'], 0, 2)],
                'items.0.item_metadata.itinerary',
            ],
            'duplicate itinerary day' => [
                ['items.0.item_metadata.itinerary.2.day' => 2],
                'items.0.item_metadata.itinerary',
            ],
            'traveler rate-class mismatch' => [
                [
                    'items.0.adults' => 2,
                    'items.0.children' => 0,
                    'items.0.item_metadata.adult_count' => 2,
                    'items.0.item_metadata.child_count' => 0,
                ],
                'items.0.item_metadata.adult_count',
            ],
            'invoice and fulfillment count mismatch' => [
                ['items.0.adults' => 2, 'items.0.children' => 0],
                'items.0.item_metadata.adult_count',
            ],
            'missing invoice traveler counts' => [
                ['items.0.adults' => null, 'items.0.children' => null],
                'items.0.item_metadata.adult_count',
            ],
        ];

        foreach ($attempts as $label => [$changes, $errorKey]) {
            $attempt = $payload;
            foreach ($changes as $path => $value) {
                data_set($attempt, $path, $value);
            }

            $this->actingAs($agent)
                ->postJson('/api/v1/billing', $attempt)
                ->assertUnprocessable("Failed bypass case: {$label}")
                ->assertJsonValidationErrors($errorKey);
            $this->assertDatabaseCount('invoices', 0);
        }
    }

    public function test_private_package_checkout_requires_a_complete_active_private_tour_catalog_service(): void
    {
        Mail::fake();
        Notification::fake();
        $agent = User::factory()->superAdmin()->create();
        $service = $this->createPrivatePackage($agent);
        $payload = $this->privatePackageCheckoutPayload($service);
        $originalConfig = $service->package_config;

        $states = [
            'inactive' => ['is_active' => false],
            'not in the sales catalog' => ['is_sales_catalog' => false],
            'wrong service engine' => ['service_type' => 'flight_booking'],
            'incomplete package configuration' => ['package_config' => [...$originalConfig, 'duration_days' => null]],
        ];

        foreach ($states as $label => $changes) {
            $service->update($changes);

            $this->actingAs($agent)
                ->postJson('/api/v1/billing', $payload)
                ->assertUnprocessable("Failed catalog state: {$label}")
                ->assertJsonValidationErrors('items.0.item_metadata.originating_catalog_service_id');
            $this->assertDatabaseCount('invoices', 0);

            $service->update([
                'is_active' => true,
                'is_sales_catalog' => true,
                'service_type' => 'private_tour',
                'package_config' => $originalConfig,
            ]);
        }

        $service->update(['package_config' => [...$originalConfig, 'valid_from' => now()->addMonths(3)->toDateString()]]);
        $this->actingAs($agent)
            ->postJson('/api/v1/billing', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.item_metadata.starts_at');
        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_bespoke_private_tour_without_a_catalog_origin_remains_supported(): void
    {
        Mail::fake();
        Notification::fake();
        $agent = User::factory()->superAdmin()->create();
        $start = now()->addMonth()->startOfDay();
        $end = $start->copy()->addDay()->endOfDay();

        $response = $this->actingAs($agent)->postJson('/api/v1/billing', [
            'customer_name' => 'Bespoke Tour Customer',
            'customer_email' => 'bespoke@example.test',
            'customer_contact' => '09179990000',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 5600,
            'tax_rate' => 0.12,
            'items' => [[
                'item_name' => 'Bespoke Heritage Tour',
                'service_type' => 'private_tour',
                'quantity' => 1,
                'unit_price' => 5000,
                'adults' => 1,
                'children' => 1,
                'adult_price' => 4000,
                'child_price' => 1000,
                'item_metadata' => [
                    'package_name' => 'Bespoke Heritage Tour',
                    'destination' => 'Vigan and Laoag',
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'passenger_count' => 2,
                    'adult_count' => 1,
                    'child_count' => 1,
                    'adult_rate' => 4000,
                    'child_rate' => 1000,
                    'traveler_types' => [
                        ['name' => 'Customer One', 'type' => 'adult'],
                        ['name' => 'Customer Two', 'type' => 'child'],
                    ],
                    'itinerary' => [
                        ['day' => 1, 'title' => 'Vigan'],
                        ['day' => 2, 'title' => 'Laoag'],
                    ],
                ],
            ]],
        ])->assertCreated();

        $fulfillment = PrivateTourBooking::firstOrFail();
        $this->assertNull($fulfillment->originating_catalog_service_id);
        $this->assertSame('Bespoke Heritage Tour', $fulfillment->package_name);
        $this->assertSame($response->json('data.id'), $fulfillment->orderItem->order->invoice_id);
    }

    private function createPrivatePackage(User $agent, array $overrides = []): Service
    {
        return Service::create([
            'name' => 'Bohol Family Escape',
            'description' => 'Three-day private family itinerary.',
            'category' => 'Package',
            'service_type' => 'private_tour',
            'package_config' => [
                'destination' => 'Bohol',
                'duration_days' => 3,
                'duration_nights' => 2,
                'minimum_pax' => 2,
                'maximum_pax' => 12,
                'booking_lead_days' => 7,
                'valid_from' => now()->subDay()->toDateString(),
                'valid_until' => now()->addMonths(6)->toDateString(),
                'default_itinerary' => ['Arrival and countryside tour', 'Island tour', 'Departure'],
            ],
            'price' => 4000,
            'adult_price' => 4000,
            'child_price' => 3500,
            'is_sales_catalog' => true,
            'is_active' => true,
            'created_by' => $agent->id,
            ...$overrides,
        ]);
    }

    private function privatePackageCheckoutPayload(Service $service): array
    {
        $start = now()->addMonths(2)->startOfDay();
        $end = $start->copy()->addDays(2)->endOfDay();

        return [
            'customer_name' => 'Maria Santos',
            'customer_email' => 'maria.santos@example.test',
            'customer_contact' => '09179998888',
            'customer_address' => 'Quezon City',
            'payment_method' => 'Cash',
            'payment_type' => 'downpayment',
            'amount_received' => 1000,
            'tax_rate' => 0.12,
            'pax_count' => 2,
            'items' => [[
                'service_id' => $service->id,
                'item_name' => $service->name,
                'service_type' => 'private_tour',
                'item_description' => $service->description,
                'quantity' => 1,
                'unit_price' => 7500,
                'adults' => 1,
                'children' => 1,
                'adult_price' => 4000,
                'child_price' => 3500,
                'service_date' => $start->toIso8601String(),
                'destination' => 'Bohol',
                'item_metadata' => [
                    'package_name' => $service->name,
                    'destination' => 'Bohol',
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'passenger_count' => 2,
                    'originating_catalog_service_id' => $service->id,
                    'adult_count' => 1,
                    'child_count' => 1,
                    'adult_rate' => 4000,
                    'child_rate' => 3500,
                    'traveler_types' => [
                        ['name' => 'Maria Santos', 'type' => 'adult'],
                        ['name' => 'Ana Santos', 'type' => 'child'],
                    ],
                    'itinerary' => [
                        ['day' => 1, 'title' => 'Bohol', 'description' => 'Arrival and countryside tour'],
                        ['day' => 2, 'title' => 'Panglao', 'description' => 'Island tour'],
                        ['day' => 3, 'title' => 'Bohol', 'description' => 'Departure'],
                    ],
                ],
            ]],
        ];
    }
}
