<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\CharterRatePlan;
use App\Models\Service;
use App\Models\TripTicket;
use App\Models\User;
use App\Services\CharterBookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CharterBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $driver;

    private Bus $bus;

    private CharterRatePlan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->superAdmin()->create();
        $this->driver = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $this->bus = Bus::create(['plate_number' => 'CHARTER-01', 'model' => 'Coach', 'vehicle_type' => 'bus', 'seating_capacity' => 49, 'status' => 'available']);
        $service = Service::create(['name' => 'Exclusive Bus Charter', 'category' => 'Transport', 'price' => 10000, 'is_active' => true, 'created_by' => $this->user->id]);
        $this->plan = CharterRatePlan::create([
            'service_id' => $service->id, 'name' => 'Metro & Provincial Bus', 'vehicle_class' => 'bus',
            'base_price' => 10000, 'included_hours' => 12, 'included_kilometers' => 100,
            'extra_hour_rate' => 500, 'extra_kilometer_rate' => 10, 'overnight_rate' => 1000,
            'includes_driver' => true, 'includes_fuel' => true, 'includes_tolls' => false, 'includes_parking' => false,
            'diesel_cost' => 4200, 'driver_meals' => 1500, 'easytrip' => 450, 'autosweep' => 250,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_packages_default_to_as_is_pricing_without_automatic_overnight_charges(): void
    {
        $start = now()->addMonth()->startOfDay();
        // Package calculation: priced as-is flat rate (10,000)
        $pricing = app(CharterBookingService::class)->calculate($this->plan, $start->toIso8601String(), $start->copy()->addDay()->toIso8601String(), 150);

        $this->assertSame(24, $pricing['duration_hours']);
        $this->assertSame(0, $pricing['extra_hours']);
        $this->assertEquals(0, $pricing['extra_kilometers']);
        $this->assertSame(1, $pricing['overnights']);
        $this->assertEquals(0, $pricing['overnight_amount']);
        $this->assertEquals(10000, $pricing['subtotal']);
    }

    public function test_agent_checkout_creates_charter_invoice_and_resource_reservation_atomically(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/sales/charter-bookings', $this->payload());

        $response->assertCreated()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.invoice.status', 'paid');
        $bookingId = $response->json('data.id');
        $this->assertDatabaseHas('charter_bookings', ['bus_id' => $this->bus->id, 'driver_id' => $this->driver->id, 'pickup_location' => 'JVD Office']);
        $this->assertDatabaseHas('invoices', ['customer_name' => 'Corporate Client', 'total_amount' => 11200]);
        $this->assertDatabaseHas('trip_tickets', [
            'invoice_id' => $response->json('data.invoice.id'),
            'bus_id' => $this->bus->id,
            'driver_id' => $this->driver->id,
            'pick_up' => 'JVD Office',
            'drop_off' => 'Baguio City',
        ]);
        $this->actingAs($this->user)->get("/api/v1/sales/charter-bookings/{$bookingId}/confirmation")
            ->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->actingAs($this->user)->get("/api/v1/sales/charter-bookings/{$bookingId}/dispatch-sheet")
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_overlapping_charter_cannot_reuse_the_same_vehicle(): void
    {
        $this->actingAs($this->user)->postJson('/api/v1/sales/charter-bookings', $this->payload())->assertCreated();
        $second = $this->payload();
        $second['lead_name'] = 'Second Client';
        $second['driver_id'] = User::factory()->create(['role' => 'driver', 'is_active' => true])->id;

        $this->actingAs($this->user)->postJson('/api/v1/sales/charter-bookings', $second)
            ->assertUnprocessable()->assertJsonValidationErrors('bus_id');
        $this->assertSame(1, CharterBooking::count());
    }

    public function test_vehicle_type_and_capacity_are_enforced_on_the_server(): void
    {
        $van = Bus::create(['plate_number' => 'VAN-01', 'model' => 'Van', 'vehicle_type' => 'van', 'seating_capacity' => 12, 'status' => 'available']);
        $payload = $this->payload();
        $payload['bus_id'] = $van->id;

        $this->actingAs($this->user)->postJson('/api/v1/sales/charter-bookings', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('bus_id');

        $payload = $this->payload();
        $payload['passenger_count'] = 60;
        $this->actingAs($this->user)->postJson('/api/v1/sales/charter-bookings', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('passenger_count');
    }

    public function test_shared_sales_checkout_creates_the_editable_charter_fulfillment(): void
    {
        $start = now()->addMonths(2)->startOfDay();
        $response = $this->actingAs($this->user)->postJson('/api/v1/billing', [
            'customer_name' => 'Corporate Client',
            'customer_email' => 'client@example.com',
            'customer_contact' => '09171234567',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 19600,
            'tax_rate' => 0.12,
            'bus_id' => $this->bus->id,
            'driver_id' => $this->driver->id,
            'pickup_location' => 'JVD Office',
            'tour_code' => 'Baguio City',
            'pax_count' => 40,
            'departure_datetime' => $start->toIso8601String(),
            'arrival_datetime' => $start->copy()->addDay()->toIso8601String(),
            'items' => [[
                'service_id' => $this->plan->service_id,
                'item_name' => 'Bus Charter',
                'service_type' => 'bus_rental',
                'quantity' => 1,
                'unit_price' => 17500,
                'item_metadata' => [
                    'rate_plan_id' => $this->plan->id,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $start->copy()->addDay()->toIso8601String(),
                    'pickup_location' => 'JVD Office',
                    'destination' => 'Baguio City',
                    'estimated_kilometers' => 150,
                    'passenger_count' => 40,
                    'booking_mode' => 'selected_seats',
                    'selected_seats' => ['1A', '1B'],
                    'passengers' => [
                        ['first_name' => 'Ana', 'last_name' => 'Santos', 'role' => 'adult', 'seat_code' => '1A'],
                    ],
                    'bus_assignments' => [
                        ['bus_id' => $this->bus->id, 'driver_id' => $this->driver->id],
                    ],
                ],
            ]],
        ]);

        $response->assertCreated();
        $invoiceId = $response->json('data.id');
        $this->assertDatabaseHas('charter_bookings', [
            'invoice_id' => $invoiceId,
            'destination' => 'Baguio City',
            'booking_mode' => 'selected_seats',
        ]);
        $booking = CharterBooking::where('invoice_id', $invoiceId)->firstOrFail();
        $this->assertSame(['1A', '1B'], $booking->selected_seats);
        $this->assertSame('Ana', $booking->passengers[0]['first_name']);
        $this->actingAs($this->user)->getJson("/api/v1/billing/{$invoiceId}")
            ->assertOk()
            ->assertJsonPath('data.pickup_location', 'JVD Office')
            ->assertJsonPath('data.destination', 'Baguio City')
            ->assertJsonPath('data.bus_id', $this->bus->id)
            ->assertJsonPath('data.driver_id', $this->driver->id)
            ->assertJsonPath('data.customer_email', 'client@example.com');
        $this->assertDatabaseHas('collections', [
            'invoice_id' => $invoiceId,
            'pick_up' => 'JVD Office',
            'drop_off' => 'Baguio City',
        ]);
        $this->assertDatabaseHas('sales_order_items', [
            'service_type' => 'bus_rental',
            'fulfillment_type' => $booking->getMorphClass(),
            'fulfillment_id' => $booking->id,
        ]);
        $ticket = TripTicket::where('invoice_id', $invoiceId)->sole();
        $this->assertSame('JVD Office', $ticket->pick_up);
        $this->assertSame('Baguio City', $ticket->drop_off);
        $this->assertSame(40, $ticket->no_of_passengers);
        $this->assertSame($this->bus->id, $ticket->bus_id);
        $this->assertSame($this->driver->id, $ticket->driver_id);
        $this->assertEquals(4200, $ticket->diesel);
        $this->assertEquals(1500, $ticket->meal_allowance);
        $this->actingAs($this->user)->getJson("/api/v1/billing/{$invoiceId}")
            ->assertOk()
            ->assertJsonPath('data.trip_tickets.0.id', $ticket->id)
            ->assertJsonPath('data.trip_tickets.0.driver.id', $this->driver->id);
    }

    public function test_shared_checkout_invoices_and_stores_explicit_extra_bus_units(): void
    {
        $secondDriver = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $secondBus = Bus::create([
            'plate_number' => 'CHARTER-02',
            'model' => 'Coach Two',
            'vehicle_type' => 'bus',
            'seating_capacity' => 49,
            'status' => 'available',
        ]);
        $start = now()->addMonths(3)->startOfDay();

        $response = $this->actingAs($this->user)->postJson('/api/v1/billing', [
            'customer_name' => 'Two Unit Client',
            'customer_email' => 'fleet@example.com',
            'customer_contact' => '09171234567',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 22400,
            'tax_rate' => 0.12,
            'bus_id' => $this->bus->id,
            'driver_id' => $this->driver->id,
            'pickup_location' => 'Cubao Pickup Point',
            'tour_code' => 'Baguio City',
            'pax_count' => 40,
            'departure_datetime' => $start->toIso8601String(),
            'arrival_datetime' => $start->copy()->addDay()->toIso8601String(),
            'items' => [[
                'service_id' => $this->plan->service_id,
                'item_name' => 'Bus Charter - 2 units',
                'service_type' => 'bus_rental',
                'quantity' => 2,
                'unit_price' => 10000,
                'item_metadata' => [
                    'rate_plan_id' => $this->plan->id,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $start->copy()->addDay()->toIso8601String(),
                    'pickup_location' => 'Cubao Pickup Point',
                    'destination' => 'Baguio City',
                    'estimated_kilometers' => 150,
                    'passenger_count' => 40,
                    'buses_required' => 2,
                    'requested_units' => 2,
                    'booking_mode' => 'entire_vehicle',
                    'bus_assignments' => [
                        ['bus_id' => $this->bus->id, 'driver_id' => $this->driver->id],
                        ['bus_id' => $secondBus->id, 'driver_id' => $secondDriver->id],
                    ],
                ],
            ]],
        ]);

        $response->assertCreated();
        $invoiceId = $response->json('data.id');
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoiceId,
            'quantity' => 2,
            'unit_price' => 10000,
            'total_price' => 20000,
        ]);
        $booking = CharterBooking::where('invoice_id', $invoiceId)->firstOrFail();
        $this->assertCount(2, $booking->fleet_assignments);
        $this->assertSame(2, $booking->pricing_snapshot['requested_units']);
        $this->assertSame('Cubao Pickup Point', $booking->pickup_location);
        $this->assertSame(40, $booking->passenger_count);
        $tickets = TripTicket::where('invoice_id', $invoiceId)->orderBy('assignment_index')->get();
        $this->assertCount(2, $tickets);
        $this->assertSame([0, 1], $tickets->pluck('assignment_index')->all());
        $this->assertSame([$this->bus->id, $secondBus->id], $tickets->pluck('bus_id')->all());
        $this->assertSame([$this->driver->id, $secondDriver->id], $tickets->pluck('driver_id')->all());
        $this->assertSame([20, 20], $tickets->pluck('no_of_passengers')->all());
        $this->assertDatabaseCount('work_orders', 2);
    }

    public function test_active_charter_booking_can_update_operations_and_manifest(): void
    {
        $created = $this->actingAs($this->user)
            ->postJson('/api/v1/sales/charter-bookings', $this->payload())
            ->assertCreated();
        $bookingId = $created->json('data.id');
        $payload = $this->payload();
        unset($payload['rate_plan_id'], $payload['estimated_kilometers'], $payload['payment_method'], $payload['payment_type'], $payload['amount_received']);
        $payload['lead_name'] = 'Updated Corporate Client';
        $payload['pickup_location'] = 'Updated Cubao Pickup';
        $payload['destination'] = 'Updated Baguio Drop-off';
        $payload['assignments'] = [['bus_id' => $this->bus->id, 'driver_id' => $this->driver->id]];
        $payload['booking_mode'] = 'selected_seats';
        $payload['selected_seats'] = ['2A'];
        $payload['passengers'] = [['first_name' => 'Jose', 'last_name' => 'Rizal', 'role' => 'adult', 'seat_code' => '2A']];

        $this->actingAs($this->user)->putJson("/api/v1/sales/charter-bookings/{$bookingId}", $payload)
            ->assertOk()
            ->assertJsonPath('data.lead_name', 'Updated Corporate Client')
            ->assertJsonPath('data.selected_seats.0', '2A')
            ->assertJsonPath('data.passengers.0.first_name', 'Jose');

        $this->assertDatabaseHas('trip_tickets', [
            'pick_up' => 'Updated Cubao Pickup',
            'drop_off' => 'Updated Baguio Drop-off',
            'no_of_passengers' => $payload['passenger_count'],
            'bus_id' => $this->bus->id,
            'driver_id' => $this->driver->id,
        ]);
    }

    public function test_removing_a_rate_plan_deactivates_it_without_deleting_its_service(): void
    {
        $this->actingAs($this->user)
            ->deleteJson("/api/v1/sales/charter-rate-plans/{$this->plan->id}")
            ->assertOk();

        $this->assertDatabaseHas('charter_rate_plans', ['id' => $this->plan->id, 'is_active' => false]);
        $this->assertDatabaseHas('services', ['id' => $this->plan->service_id]);
    }

    private function payload(): array
    {
        $start = now()->addMonth()->startOfDay();

        return [
            'rate_plan_id' => $this->plan->id, 'lead_name' => 'Corporate Client', 'lead_email' => 'client@example.com',
            'lead_contact' => '09171234567', 'bus_id' => $this->bus->id, 'driver_id' => $this->driver->id,
            'starts_at' => $start->toIso8601String(), 'ends_at' => $start->copy()->addDay()->toIso8601String(),
            'pickup_location' => 'JVD Office', 'destination' => 'Baguio City', 'stops' => ['NLEX Stopover'],
            'passenger_count' => 40, 'estimated_kilometers' => 150, 'operations_notes' => 'Report 30 minutes early.',
            'payment_method' => 'Cash', 'payment_type' => 'full', 'amount_received' => 11200,
        ];
    }
}
