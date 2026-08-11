<?php

namespace Tests\Feature;

use App\Models\AccommodationBooking;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\FlightBooking;
use App\Models\Invoice;
use App\Models\SalesRefund;
use App\Models\Service;
use App\Models\User;
use App\Services\SalesOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SalesOrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_bespoke_invoice_capture_creates_multiple_typed_fulfillments_without_catalog_services(): void
    {
        $user = User::factory()->superAdmin()->create();
        $customer = Customer::create(['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria@example.com', 'phone' => '09170000000']);
        $departure = now()->addMonths(3)->startOfDay()->addHours(8);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-BESPOKE-001', 'customer_id' => $customer->id, 'customer_name' => 'Maria Santos',
            'subtotal' => 23000, 'tax_amount' => 0, 'total_amount' => 23000, 'amount_received' => 23000, 'balance' => 0,
            'payment_method' => 'Cash', 'payment_type' => 'full', 'status' => 'paid', 'created_by' => $user->id,
        ]);
        $invoice->items()->create([
            'service_id' => null, 'item_name' => 'Manila to Cebu Flight', 'service_type' => 'flight_booking',
            'item_description' => 'Round-trip airfare for two passengers', 'quantity' => 1, 'unit_price' => 15000, 'total_price' => 15000,
            'item_metadata' => [
                'trip_type' => 'round_trip', 'origin' => 'MNL', 'destination' => 'CEB', 'departure_at' => $departure->toIso8601String(),
                'return_at' => $departure->copy()->addDays(4)->toIso8601String(), 'airline' => 'Philippine Airlines', 'passenger_count' => 2,
                'passengers' => [['name' => 'Maria Santos', 'type' => 'adult'], ['name' => 'Ana Santos', 'type' => 'adult']],
            ],
        ]);
        $invoice->items()->create([
            'service_id' => null, 'item_name' => 'Cebu Hotel', 'service_type' => 'accommodation_booking',
            'item_description' => 'Four-night hotel stay', 'quantity' => 1, 'unit_price' => 8000, 'total_price' => 8000,
            'item_metadata' => [
                'property_name' => 'Cebu Business Hotel', 'city' => 'Cebu City', 'check_in' => $departure->toDateString(),
                'check_out' => $departure->copy()->addDays(4)->toDateString(), 'room_type' => 'Twin Room', 'room_count' => 1,
                'adult_count' => 2, 'child_count' => 0, 'guest_names' => ['Maria Santos', 'Ana Santos'], 'meal_plan' => ['Breakfast'],
            ],
        ]);

        $service = app(SalesOrderService::class);
        $order = $service->captureInvoice($invoice, $user->id);
        $flightItem = $order->items->firstWhere('service_type', 'flight_booking');
        $hotelItem = $order->items->firstWhere('service_type', 'accommodation_booking');

        $this->assertCount(2, $order->items);
        $this->assertNull($flightItem->service_id);
        $this->assertNull($hotelItem->service_id);
        $this->assertInstanceOf(FlightBooking::class, $flightItem->fulfillment);
        $this->assertInstanceOf(AccommodationBooking::class, $hotelItem->fulfillment);
        $this->assertSame('confirmed', $flightItem->fulfillment->status);
        $this->assertSame('confirmed', $hotelItem->fulfillment->status);
        $this->assertDatabaseCount('services', 0);
        $this->assertDatabaseCount('flight_bookings', 1);
        $this->assertDatabaseCount('accommodation_bookings', 1);

        $capturedAgain = $service->captureInvoice($invoice->fresh(), $user->id);
        $this->assertSame($order->id, $capturedAgain->id);
        $this->assertDatabaseCount('sales_orders', 1);
        $this->assertDatabaseCount('sales_order_items', 2);
        $this->assertDatabaseCount('flight_bookings', 1);
        $this->assertDatabaseCount('accommodation_bookings', 1);
        $this->assertDatabaseCount('sales_order_events', 1);
    }

    public function test_bespoke_invoice_capture_reports_line_scoped_metadata_validation_errors(): void
    {
        $user = User::factory()->superAdmin()->create();
        $customer = Customer::create(['first_name' => 'Paolo', 'last_name' => 'Reyes']);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-BESPOKE-INVALID', 'customer_id' => $customer->id, 'customer_name' => 'Paolo Reyes',
            'subtotal' => 5000, 'tax_amount' => 0, 'total_amount' => 5000, 'amount_received' => 5000, 'balance' => 0,
            'payment_method' => 'Cash', 'payment_type' => 'full', 'status' => 'paid', 'created_by' => $user->id,
        ]);
        $invoice->items()->create([
            'service_id' => null, 'item_name' => 'Incomplete Flight', 'service_type' => 'flight_booking',
            'quantity' => 1, 'unit_price' => 5000, 'total_price' => 5000,
            'item_metadata' => ['trip_type' => 'one_way'],
        ]);

        try {
            app(SalesOrderService::class)->captureInvoice($invoice, $user->id);
            $this->fail('Invalid operational metadata should reject invoice capture.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('items.0.item_metadata.origin', $exception->errors());
            $this->assertStringContainsString('Invoice line 1 (Incomplete Flight)', $exception->errors()['items.0.item_metadata.origin'][0]);
        }

        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('sales_orders', 0);
        $this->assertDatabaseCount('flight_bookings', 0);
    }

    public function test_generic_booking_cannot_steal_a_typed_invoice_line(): void
    {
        $user = User::factory()->superAdmin()->create();
        $customer = Customer::create(['first_name' => 'Legacy', 'last_name' => 'Repair']);
        $departure = now()->addMonths(2)->startOfDay()->addHours(7);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-TYPED-OWNERSHIP', 'customer_id' => $customer->id, 'customer_name' => 'Legacy Repair',
            'subtotal' => 5000, 'tax_amount' => 0, 'total_amount' => 5000, 'amount_received' => 5000, 'balance' => 0,
            'payment_method' => 'Cash', 'payment_type' => 'full', 'status' => 'paid', 'created_by' => $user->id,
        ]);
        $invoice->items()->create([
            'item_name' => 'Typed Flight', 'service_type' => 'flight_booking', 'quantity' => 1, 'unit_price' => 5000, 'total_price' => 5000,
            'item_metadata' => [
                'trip_type' => 'one_way', 'origin' => 'MNL', 'destination' => 'CEB', 'departure_at' => $departure->toIso8601String(),
                'airline' => 'Test Air', 'passenger_count' => 1, 'passengers' => [['name' => 'Legacy Repair', 'type' => 'adult']],
            ],
        ]);
        $generic = Booking::create(['invoice_id' => $invoice->id, 'travel_date' => $departure->toDateString(), 'pax_count' => 1]);

        $order = app(SalesOrderService::class)->captureInvoice($invoice, $user->id);
        $item = $order->items->firstOrFail();

        $this->assertInstanceOf(FlightBooking::class, $item->fulfillment);
        $this->assertNotSame($generic->getMorphClass(), $item->fulfillment_type);
        $this->assertDatabaseCount('flight_bookings', 1);
    }

    public function test_multi_service_order_confirms_as_one_invoice_and_reserves_typed_fulfillments(): void
    {
        Mail::fake();
        Notification::fake();
        [$user,$customer,$bus,$driver,$tour,$hotel] = $this->fixtures();

        $order = $this->actingAs($user)->postJson('/api/v1/sales/orders', ['customer_id' => $customer->id, 'notes' => 'Family itinerary'])
            ->assertCreated()->json('data');
        $start = now()->addMonths(2)->startOfDay();

        $this->actingAs($user)->postJson("/api/v1/sales/orders/{$order['id']}/items", [
            'service_type' => 'private_tour', 'service_id' => $tour->id, 'quantity' => 1, 'unit_price' => 10000,
            'details' => [
                'package_name' => $tour->name, 'destination' => 'Baguio', 'starts_at' => $start->toIso8601String(),
                'ends_at' => $start->copy()->addDays(2)->toIso8601String(), 'passenger_count' => 6, 'pickup_location' => 'JVD Office',
                'bus_id' => $bus->id, 'driver_id' => $driver->id,
                'originating_catalog_service_id' => $tour->id, 'adult_count' => 6, 'child_count' => 0,
                'traveler_types' => collect(range(1, 6))->map(fn ($number) => ['name' => "Traveler {$number}", 'type' => 'adult'])->all(),
                'itinerary' => [
                    ['day' => 1, 'title' => 'City tour', 'description' => 'Private guided city program'],
                    ['day' => 2, 'title' => 'Highlands', 'description' => 'Private guided highlands program'],
                    ['day' => 3, 'title' => 'Departure', 'description' => 'Return transfer'],
                ],
                'inclusions' => ['Transport', 'Guide'], 'exclusions' => ['Personal expenses'],
            ],
        ])->assertCreated();

        $this->actingAs($user)->postJson("/api/v1/sales/orders/{$order['id']}/items", [
            'service_type' => 'accommodation_booking', 'service_id' => $hotel->id, 'quantity' => 1, 'unit_price' => 5000,
            'details' => [
                'property_name' => 'Baguio Hotel', 'city' => 'Baguio', 'check_in' => $start->toDateString(),
                'check_out' => $start->copy()->addDays(2)->toDateString(), 'room_type' => 'Family Room', 'room_count' => 1,
                'adult_count' => 4, 'child_count' => 2, 'guest_names' => ['Juan Dela Cruz', 'Maria Dela Cruz', 'Paolo Dela Cruz', 'Ana Dela Cruz', 'Mia Dela Cruz', 'Leo Dela Cruz'], 'meal_plan' => ['Breakfast'],
            ],
        ])->assertCreated();

        $response = $this->actingAs($user)->postJson("/api/v1/sales/orders/{$order['id']}/confirm", [
            'payment_method' => 'Cash', 'payment_type' => 'full', 'amount_received' => 16800,
        ])->assertOk()->assertJsonPath('data.status', 'confirmed');

        $invoiceId = $response->json('data.invoice_id');
        $this->assertDatabaseCount('invoice_items', 2);
        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'total_amount' => 16800, 'status' => 'paid']);
        $this->assertDatabaseHas('private_tour_bookings', ['bus_id' => $bus->id, 'driver_id' => $driver->id, 'status' => 'confirmed']);
        $this->assertDatabaseHas('accommodation_bookings', ['property_name' => 'Baguio Hotel', 'status' => 'confirmed']);
        $this->assertDatabaseHas('resource_allocations', ['bus_id' => $bus->id, 'driver_id' => $driver->id, 'status' => 'confirmed']);
        $this->assertDatabaseHas('trip_tickets', ['invoice_id' => $invoiceId, 'bus_id' => $bus->id, 'driver_id' => $driver->id]);

        $this->actingAs($user)->getJson("/api/v1/sales/transactions/invoices/{$invoiceId}")
            ->assertOk()
            ->assertJsonPath('data.customer.email', $customer->email)
            ->assertJsonPath('data.invoice.id', $invoiceId)
            ->assertJsonCount(1, 'data.invoice.trip_tickets');
        $this->actingAs($user)->getJson("/api/v1/sales/services/{$tour->id}/details")
            ->assertOk()
            ->assertJsonPath('data.service.id', $tour->id)
            ->assertJsonPath('data.transactions.0.order.invoice.id', $invoiceId);
        foreach (['invoice', 'manifest', 'quotation'] as $document) {
            $this->actingAs($user)->get("/api/v1/sales/orders/{$order['id']}/documents/{$document}")
                ->assertOk()
                ->assertHeader('content-type', 'application/pdf');
        }
    }

    public function test_cancellation_credit_and_refund_are_approved_and_posted_separately(): void
    {
        Mail::fake();
        Notification::fake();
        [$user,$customer,$bus,$driver,$tour] = $this->fixtures();
        $start = now()->addMonths(2)->startOfDay();
        $orderId = $this->actingAs($user)->postJson('/api/v1/sales/orders', ['customer_id' => $customer->id])->assertCreated()->json('data.id');
        $this->actingAs($user)->postJson("/api/v1/sales/orders/{$orderId}/items", [
            'service_type' => 'private_tour', 'service_id' => $tour->id, 'quantity' => 1, 'unit_price' => 10000,
            'details' => ['package_name' => $tour->name, 'destination' => 'Baguio', 'starts_at' => $start->toIso8601String(),
                'ends_at' => $start->copy()->addDays(2)->toIso8601String(), 'passenger_count' => 4, 'bus_id' => $bus->id, 'driver_id' => $driver->id,
                'originating_catalog_service_id' => $tour->id, 'adult_count' => 4, 'child_count' => 0,
                'traveler_types' => collect(range(1, 4))->map(fn ($number) => ['name' => "Traveler {$number}", 'type' => 'adult'])->all(),
                'itinerary' => [['day' => 1, 'title' => 'Tour'], ['day' => 2, 'title' => 'Tour'], ['day' => 3, 'title' => 'Departure']]],
        ])->assertCreated();
        $this->actingAs($user)->postJson("/api/v1/sales/orders/{$orderId}/confirm", [
            'payment_method' => 'Cash', 'payment_type' => 'full', 'amount_received' => 11200,
        ])->assertOk();

        $adjustmentId = $this->actingAs($user)->postJson("/api/v1/sales/orders/{$orderId}/adjustments", [
            'type' => 'cancellation', 'reason' => 'Customer cancelled within the full-refund period',
        ])->assertCreated()->json('data.id');
        $this->actingAs($user)->postJson("/api/v1/sales/order-adjustments/{$adjustmentId}/approve")->assertOk();

        $credit = CreditNote::firstOrFail();
        $this->assertSame(11200.0, (float) $credit->total_amount);
        $this->assertDatabaseHas('sales_orders', ['id' => $orderId, 'status' => 'cancelled']);
        $this->assertDatabaseHas('resource_allocations', ['bus_id' => $bus->id, 'status' => 'cancelled']);

        $refundId = $this->actingAs($user)->postJson("/api/v1/sales/credit-notes/{$credit->id}/refunds", [
            'amount' => 11200, 'refund_method' => 'Cash', 'reason' => 'Return customer payment',
        ])->assertCreated()->json('data.id');
        $this->actingAs($user)->postJson("/api/v1/sales/refunds/{$refundId}/approve")->assertOk();
        $this->actingAs($user)->postJson("/api/v1/sales/refunds/{$refundId}/process", ['destination_reference' => 'CASH-TEST'])->assertOk();

        $this->assertSame('processed', SalesRefund::findOrFail($refundId)->status);
        $this->assertDatabaseHas('invoices', ['refunded_amount' => 11200, 'credited_amount' => 11200]);
        $this->assertDatabaseHas('journal_entries', ['reference_type' => SalesRefund::class, 'reference_id' => $refundId]);
    }

    private function fixtures(): array
    {
        $user = User::factory()->superAdmin()->create();
        $customer = Customer::create(['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'email' => 'juan@example.com', 'phone' => '09171234567']);
        $driver = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $bus = Bus::create(['plate_number' => 'ORDER-01', 'model' => 'Van', 'vehicle_type' => 'van', 'seating_capacity' => 12, 'status' => 'available']);
        $tour = Service::create([
            'name' => 'Private Tour', 'category' => 'Private Tour', 'service_type' => 'private_tour', 'price' => 10000,
            'is_active' => true, 'is_sales_catalog' => true, 'created_by' => $user->id,
            'package_config' => [
                'destination' => 'Baguio', 'duration_days' => 3, 'duration_nights' => 2,
                'minimum_pax' => 1, 'maximum_pax' => 12, 'booking_lead_days' => 0,
                'default_itinerary' => ['City tour', 'Highlands', 'Departure'],
            ],
        ]);
        $hotel = Service::create(['name' => 'Hotel Stay', 'category' => 'Accommodation', 'service_type' => 'accommodation_booking', 'price' => 5000, 'is_active' => true, 'created_by' => $user->id]);

        return [$user, $customer, $bus, $driver, $tour, $hotel];
    }
}
