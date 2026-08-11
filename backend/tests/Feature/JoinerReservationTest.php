<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerPassenger;
use App\Models\JoinerReservation;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JoinerReservationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->superAdmin()->create();
        $this->service = Service::create([
            'name' => 'Sagada Fixed Joiner',
            'category' => 'Joiners',
            'price' => 4500,
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_departure_requires_a_valid_fixed_schedule_and_materializes_seats(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/sales/joiner-departures', [
            'service_id' => $this->service->id,
            'starts_at' => now()->addMonth()->setTime(5, 0)->toIso8601String(),
            'ends_at' => now()->addMonth()->addDays(3)->setTime(22, 0)->toIso8601String(),
            'booking_cutoff_at' => now()->addMonth()->subDay()->toIso8601String(),
            'capacity' => 3,
            'seat_codes' => ['A1', 'A2', 'B1'],
            'status' => 'published',
        ]);

        $response->assertCreated();
        // Code is now auto-generated in the format JNR-DESTINATION-MMDDYY-SEQ
        $this->assertMatchesRegularExpression('/^JNR-[A-Z]+-\d{6}-\d{3}$/', $response->json('data.code'));
        $this->assertDatabaseCount('joiner_departure_seats', 3);
    }

    public function test_a_held_seat_cannot_be_sold_to_a_second_customer(): void
    {
        $departure = $this->departure();

        $first = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Juan Cruz',
            'passenger_count' => 1,
            'seat_codes' => ['A1'],
        ]);
        $first->assertCreated()->assertJsonPath('data.status', 'held');

        $second = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Maria Santos',
            'passenger_count' => 1,
            'seat_codes' => ['A1'],
        ]);
        $second->assertUnprocessable()->assertJsonValidationErrors('seat_codes');
    }

    public function test_confirmation_assigns_each_named_passenger_to_one_held_seat(): void
    {
        $departure = $this->departure();
        $hold = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Juan Cruz',
            'passenger_count' => 2,
            'seat_codes' => ['A1', 'A2'],
        ])->assertCreated();

        $reservationId = $hold->json('data.id');
        $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-reservations/{$reservationId}/confirm", [
            'passengers' => [
                ['seat_code' => 'A1', 'first_name' => 'Juan', 'last_name' => 'Cruz', 'passenger_type' => 'adult'],
                ['seat_code' => 'A2', 'first_name' => 'Ana', 'last_name' => 'Cruz', 'passenger_type' => 'child'],
            ],
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 10080,
        ])->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('joiner_passengers', ['first_name' => 'Juan', 'last_name' => 'Cruz']);
        $this->assertSame(2, JoinerDepartureSeat::where('departure_id', $departure->id)->where('status', 'confirmed')->count());
        $this->assertSame(2, $departure->fresh()->confirmed_count);
        $this->assertDatabaseHas('invoices', ['customer_name' => 'Juan Cruz', 'status' => 'paid']);
        $this->assertNotNull(JoinerReservation::findOrFail($reservationId)->invoice_id);
    }

    public function test_lead_customer_and_child_carry_to_invoice_while_confirmed_seats_stay_unavailable(): void
    {
        $this->service->update(['adult_price' => 4500, 'child_price' => 3000, 'service_type' => 'joiner_tour']);
        $departure = $this->departure();

        $hold = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Customer One',
            'lead_email' => 'customer.one@example.test',
            'passenger_count' => 2,
            'seat_codes' => ['A1', 'A2'],
        ])->assertCreated();

        $reservationId = $hold->json('data.id');
        $confirmation = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-reservations/{$reservationId}/confirm", [
            'passengers' => [
                ['seat_code' => 'A1', 'first_name' => 'Customer', 'last_name' => 'One', 'passenger_type' => 'adult'],
                ['seat_code' => 'A2', 'first_name' => 'Child', 'last_name' => 'One', 'passenger_type' => 'child', 'date_of_birth' => '2018-05-10'],
            ],
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 8400,
        ])->assertOk();

        $invoiceId = $confirmation->json('data.invoice.id');
        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'customer_name' => 'Customer One', 'subtotal' => 7500]);
        $this->assertDatabaseHas('invoice_items', ['invoice_id' => $invoiceId, 'adults' => 1, 'children' => 1, 'adult_price' => 4500, 'child_price' => 3000]);
        $this->assertDatabaseHas('joiner_passengers', ['reservation_id' => $reservationId, 'first_name' => 'Child', 'last_name' => 'One', 'passenger_type' => 'child']);

        $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Customer Two',
            'passenger_count' => 2,
            'seat_codes' => ['A1', 'A2'],
        ])->assertUnprocessable()->assertJsonValidationErrors('seat_codes');

        $this->assertSame(2, JoinerDepartureSeat::where('departure_id', $departure->id)->whereIn('seat_code', ['A1', 'A2'])->where('status', 'confirmed')->count());
    }

    public function test_expired_hold_is_released_before_a_new_hold(): void
    {
        $departure = $this->departure();
        $seat = JoinerDepartureSeat::where('departure_id', $departure->id)->where('seat_code', 'A1')->firstOrFail();
        $expired = JoinerReservation::create([
            'departure_id' => $departure->id,
            'reference' => fake()->uuid(),
            'lead_name' => 'Expired Customer',
            'passenger_count' => 1,
            'status' => 'held',
            'hold_expires_at' => now()->subMinute(),
            'created_by' => $this->user->id,
        ]);
        $seat->update(['reservation_id' => $expired->id, 'status' => 'held', 'held_until' => now()->subMinute()]);

        $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'New Customer',
            'passenger_count' => 1,
            'seat_codes' => ['A1'],
        ])->assertCreated();

        $this->assertSame('expired', $expired->fresh()->status);
    }

    public function test_invalid_payment_rolls_back_passengers_and_invoice_but_keeps_the_hold(): void
    {
        $departure = $this->departure();
        $hold = $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-departures/{$departure->id}/holds", [
            'lead_name' => 'Underpaid Customer',
            'passenger_count' => 1,
            'seat_codes' => ['A1'],
        ])->assertCreated();

        $reservationId = $hold->json('data.id');
        $this->actingAs($this->user)->postJson("/api/v1/sales/joiner-reservations/{$reservationId}/confirm", [
            'passengers' => [['seat_code' => 'A1', 'first_name' => 'Low', 'last_name' => 'Payment', 'passenger_type' => 'adult']],
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 100,
        ])->assertUnprocessable()->assertJsonValidationErrors('amount_received');

        $reservation = JoinerReservation::findOrFail($reservationId);
        $this->assertSame('held', $reservation->status);
        $this->assertNull($reservation->invoice_id);
        $this->assertDatabaseMissing('joiner_passengers', ['reservation_id' => $reservationId]);
        $this->assertDatabaseMissing('invoices', ['customer_name' => 'Underpaid Customer']);
    }

    public function test_resource_options_mark_overlapping_bus_and_driver_unavailable(): void
    {
        $driver = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $bus = Bus::create(['plate_number' => 'JVD-TEST-1', 'model' => 'Test Coach', 'seating_capacity' => 49, 'status' => 'available']);
        $departure = $this->departure();
        $departure->update(['bus_id' => $bus->id, 'driver_id' => $driver->id]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/sales/joiner-departure-resources?'.http_build_query([
            'starts_at' => $departure->starts_at->copy()->addHour()->toIso8601String(),
            'ends_at' => $departure->ends_at->copy()->subHour()->toIso8601String(),
        ]));

        $response->assertOk();
        $this->assertFalse(collect($response->json('data.buses'))->firstWhere('id', $bus->id)['available']);
        $this->assertFalse(collect($response->json('data.drivers'))->firstWhere('id', $driver->id)['available']);
    }

    public function test_manifest_is_a_printable_pdf_for_operations(): void
    {
        $departure = $this->departure();

        $response = $this->actingAs($this->user)->get("/api/v1/sales/joiner-departures/{$departure->id}/manifest");

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_legacy_generic_joiner_checkout_is_repaired_for_the_passenger_manifest(): void
    {
        $departure = $this->departure();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-LEGACY-JOINER',
            'customer_name' => 'Val Javez Lamsen',
            'customer_email' => 'val@example.test',
            'customer_contact' => '09171234567',
            'subtotal' => 4500,
            'tax_amount' => 540,
            'total_amount' => 5040,
            'amount_received' => 5040,
            'change' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'balance' => 0,
            'status' => 'paid',
            'created_by' => $this->user->id,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $this->service->id,
            'service_type' => 'joiner_tour',
            'item_description' => "Seat A1 (1 adult, 0 child). Passengers: Val Javez Lamsen. Tour Code: {$departure->code}.",
            'quantity' => 1,
            'unit_price' => 4500,
            'total_price' => 4500,
            'adults' => 1,
            'children' => 0,
        ]);
        Booking::create([
            'invoice_id' => $invoice->id,
            'seat_map' => ['A1'],
            'travel_date' => $departure->starts_at->toDateString(),
            'tour_code' => $departure->code,
            'pax_count' => 1,
            'status' => 'confirmed',
        ]);
        JoinerDepartureSeat::where('departure_id', $departure->id)->where('seat_code', 'A1')->update(['status' => 'confirmed']);

        $migration = require database_path('migrations/2026_08_12_020000_repair_legacy_joiner_manifest_records.php');
        $migration->up();

        $reservation = JoinerReservation::where('invoice_id', $invoice->id)->firstOrFail();
        $this->assertSame('confirmed', $reservation->status);
        $this->assertDatabaseHas('joiner_passengers', [
            'reservation_id' => $reservation->id,
            'first_name' => 'Val',
            'last_name' => 'Javez Lamsen',
            'passenger_type' => 'adult',
        ]);
        $this->assertSame($reservation->id, JoinerDepartureSeat::where('departure_id', $departure->id)->where('seat_code', 'A1')->value('reservation_id'));
        $this->assertSame(1, JoinerPassenger::where('reservation_id', $reservation->id)->count());
    }

    private function departure(): JoinerDeparture
    {
        $departure = JoinerDeparture::create([
            'service_id' => $this->service->id,
            'code' => 'TEST-'.fake()->unique()->numerify('####'),
            'starts_at' => now()->addMonth(),
            'ends_at' => now()->addMonth()->addDays(3),
            'booking_cutoff_at' => now()->addMonth()->subDay(),
            'capacity' => 3,
            'status' => 'published',
            'created_by' => $this->user->id,
        ]);
        foreach (['A1', 'A2', 'B1'] as $code) {
            JoinerDepartureSeat::create(['departure_id' => $departure->id, 'seat_code' => $code]);
        }

        return $departure;
    }
}
