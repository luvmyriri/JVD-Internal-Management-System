<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PrivateTourBooking;
use App\Models\ResourceAllocation;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Service;
use App\Models\TripTicket;
use App\Models\User;
use App\Services\ResourceAllocationService;
use App\Services\DocumentPdfService;
use App\Services\TripTicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PrivateTourLogisticsHandoffTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_tour_allocation_is_discoverable_as_one_linked_draft_trip_ticket(): void
    {
        Notification::fake();
        [$agent, $orderItem, $fulfillment] = $this->privateTourSale();

        $ticket = app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $agent->id);
        app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $agent->id);

        $this->assertNotNull($ticket);
        $this->assertDatabaseCount('trip_tickets', 1);
        $this->assertDatabaseHas('trip_tickets', [
            'id' => $ticket->id,
            'invoice_id' => $orderItem->order->invoice_id,
            'sales_order_item_id' => $orderItem->id,
            'bus_id' => $fulfillment->bus_id,
            'driver_id' => $fulfillment->driver_id,
            'status' => 'draft',
        ]);
        $this->assertDatabaseHas('work_orders', [
            'trip_ticket_id' => $ticket->id,
            'invoice_id' => $orderItem->order->invoice_id,
            'type' => 'trip',
            'status' => 'pending_approval',
        ]);

        $activeAllocations = ResourceAllocation::whereNotIn('status', ['cancelled', 'completed'])->get();
        $this->assertCount(1, $activeAllocations);
        $this->assertSame(PrivateTourBooking::class, $activeAllocations->first()->source_type);
        $this->assertSame($fulfillment->id, $activeAllocations->first()->source_id);
        $this->assertDatabaseMissing('resource_allocations', [
            'source_type' => TripTicket::class,
            'source_id' => $ticket->id,
        ]);

        $this->actingAs($agent)
            ->getJson('/api/v1/trip-tickets')
            ->assertOk()
            ->assertJsonPath('0.sales_order_item.id', $orderItem->id)
            ->assertJsonPath('0.sales_order_item.order.order_number', $orderItem->order->order_number)
            ->assertJsonPath('0.invoice.invoice_number', $orderItem->order->invoice->invoice_number);
    }

    public function test_logistics_reassignment_updates_fulfillment_ticket_and_allocation_atomically(): void
    {
        Notification::fake();
        [$agent, $orderItem, $fulfillment] = $this->privateTourSale();
        $ticket = app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $agent->id);
        $replacementBus = $this->bus('NEW-202');
        $replacementDriver = User::factory()->create(['role' => 'driver', 'is_active' => true]);

        $this->actingAs($agent)
            ->putJson("/api/v1/trip-tickets/{$ticket->id}", [
                'bus_id' => $replacementBus->id,
                'driver_id' => $replacementDriver->id,
            ])
            ->assertOk();

        $this->assertSame($replacementBus->id, $ticket->fresh()->bus_id);
        $this->assertSame($replacementDriver->id, $ticket->fresh()->driver_id);
        $this->assertSame($replacementBus->id, $fulfillment->fresh()->bus_id);
        $this->assertSame($replacementDriver->id, $fulfillment->fresh()->driver_id);
        $this->assertDatabaseHas('resource_allocations', [
            'source_type' => PrivateTourBooking::class,
            'source_id' => $fulfillment->id,
            'bus_id' => $replacementBus->id,
            'driver_id' => $replacementDriver->id,
            'status' => 'confirmed',
        ]);
        $this->assertDatabaseMissing('resource_allocations', [
            'source_type' => PrivateTourBooking::class,
            'source_id' => $fulfillment->id,
            'bus_id' => $replacementBus->id,
            'status' => 'cancelled',
        ]);
        $this->assertSame(1, ResourceAllocation::where('source_type', PrivateTourBooking::class)
            ->where('source_id', $fulfillment->id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->count());
    }

    public function test_invoice_api_and_pdf_retain_typed_private_tour_and_driver_contacts(): void
    {
        Notification::fake();
        [$agent, $orderItem] = $this->privateTourSale();
        app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $agent->id);
        $invoice = $orderItem->order->invoice;

        $this->actingAs($agent)
            ->getJson("/api/v1/billing/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.private_tour_booking.package_name', 'Bohol Private Tour')
            ->assertJsonPath('data.private_tour_booking.destination', 'Bohol')
            ->assertJsonPath('data.private_tour_booking.passenger_count', 2)
            ->assertJsonPath('data.bus.plate_number', 'TOUR-101')
            ->assertJsonPath('data.driver.phone', '09171234567')
            ->assertJsonPath('data.driver.email', 'captain@example.test')
            ->assertJsonPath('data.private_tour_booking.trip_ticket_number', 'DTT-'.now()->year.'-0001');

        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->findOrFail($invoice->id);
        $html = view('pdf.invoice', ['invoice' => $invoice, 'taxRate' => 0.12])->render();
        $this->assertStringContainsString('Private Tour Fulfillment', $html);
        $this->assertStringContainsString('Bohol Private Tour', $html);
        $this->assertStringContainsString('09171234567', $html);
        $this->assertStringContainsString('captain@example.test', $html);
        $this->assertStringContainsString('Maria Santos, Ana Santos', $html);

        if (getenv('JVD_WRITE_PRIVATE_TOUR_PDF') === '1') {
            $directory = base_path('tmp/pdfs');
            if (!is_dir($directory)) mkdir($directory, 0777, true);
            app(DocumentPdfService::class)
                ->render('pdf.invoice', ['invoice' => $invoice, 'taxRate' => 0.12])
                ->save($directory.'/private-tour-invoice.pdf');
        }
    }

    public function test_linked_ticket_rejects_schedule_drift_and_rolls_back_conflicting_assignment(): void
    {
        Notification::fake();
        [$agent, $orderItem, $fulfillment] = $this->privateTourSale();
        $ticket = app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $agent->id);

        $this->actingAs($agent)
            ->putJson("/api/v1/trip-tickets/{$ticket->id}", [
                'date_of_travel' => now()->addMonths(4)->toDateString(),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This trip schedule came from a confirmed sale. Amend or rebook its dates in Sales so the invoice, customer itinerary, and fleet allocation remain synchronized.');

        $occupiedBus = $this->bus('BUSY-303');
        $occupiedDriver = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $blocker = TripTicket::create([
            'control_no' => 'DTT-BLOCKER-1',
            'issue_date' => now()->toDateString(),
            'date_of_travel' => $ticket->date_of_travel,
            'duration' => $ticket->duration,
            'pick_up' => 'Depot',
            'drop_off' => 'Occupied Route',
            'bus_id' => $occupiedBus->id,
            'driver_id' => $occupiedDriver->id,
            'no_of_passengers' => 1,
            'status' => 'draft',
            'requested_by' => $agent->id,
        ]);

        $this->actingAs($agent)
            ->putJson("/api/v1/trip-tickets/{$ticket->id}", [
                'bus_id' => $occupiedBus->id,
                'driver_id' => $occupiedDriver->id,
            ])
            ->assertUnprocessable();

        $this->assertSame($fulfillment->bus_id, $ticket->fresh()->bus_id);
        $this->assertSame($fulfillment->driver_id, $ticket->fresh()->driver_id);
        $this->assertDatabaseHas('resource_allocations', [
            'source_type' => TripTicket::class,
            'source_id' => $blocker->id,
            'bus_id' => $occupiedBus->id,
            'driver_id' => $occupiedDriver->id,
        ]);
    }

    /** @return array{User, SalesOrderItem, PrivateTourBooking} */
    private function privateTourSale(): array
    {
        $agent = User::factory()->superAdmin()->create();
        $driver = User::factory()->create([
            'role' => 'driver',
            'is_active' => true,
            'phone' => '09171234567',
            'email' => 'captain@example.test',
        ]);
        $bus = $this->bus('TOUR-101');
        $service = Service::create([
            'name' => 'Bohol Private Tour',
            'category' => 'Package',
            'service_type' => 'private_tour',
            'price' => 10000,
            'is_active' => true,
            'is_sales_catalog' => true,
            'created_by' => $agent->id,
        ]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-HANDOFF-1',
            'customer_name' => 'Maria Santos',
            'subtotal' => 10000,
            'tax_amount' => 1200,
            'total_amount' => 11200,
            'payment_method' => 'Cash',
            'status' => 'paid',
            'created_by' => $agent->id,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'item_name' => $service->name,
            'service_type' => 'private_tour',
            'item_description' => 'Three-day private family tour.',
            'quantity' => 1,
            'unit_price' => 10000,
            'total_price' => 10000,
            'adults' => 1,
            'children' => 1,
            'adult_price' => 5500,
            'child_price' => 4500,
        ]);
        $start = now()->addMonths(2)->startOfDay();
        $end = $start->copy()->addDays(2)->endOfDay();
        $order = SalesOrder::create([
            'order_number' => 'ORD-HANDOFF-1',
            'invoice_id' => $invoice->id,
            'agent_id' => $agent->id,
            'status' => 'confirmed',
            'subtotal' => 10000,
            'tax_amount' => 1200,
            'total_amount' => 11200,
            'travel_starts_at' => $start,
            'travel_ends_at' => $end,
        ]);
        $item = SalesOrderItem::create([
            'sales_order_id' => $order->id,
            'line_number' => 1,
            'service_type' => 'private_tour',
            'service_id' => $service->id,
            'status' => 'confirmed',
            'title' => $service->name,
            'quantity' => 1,
            'unit_price' => 10000,
            'subtotal' => 10000,
            'tax_amount' => 1200,
            'total_amount' => 11200,
            'scheduled_start' => $start,
            'scheduled_end' => $end,
            'traveler_count' => 2,
        ]);
        $fulfillment = PrivateTourBooking::create([
            'sales_order_item_id' => $item->id,
            'status' => 'confirmed',
            'package_name' => $service->name,
            'destination' => 'Bohol',
            'starts_at' => $start,
            'ends_at' => $end,
            'passenger_count' => 2,
            'pickup_location' => 'JVD Office',
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'itinerary' => [['day' => 1, 'title' => 'Arrival']],
            'adult_count' => 1,
            'child_count' => 1,
            'adult_rate' => 5500,
            'child_rate' => 4500,
            'traveler_types' => [
                ['name' => 'Maria Santos', 'type' => 'adult'],
                ['name' => 'Ana Santos', 'type' => 'child'],
            ],
        ]);
        $item->fulfillment()->associate($fulfillment);
        $item->save();
        app(ResourceAllocationService::class)->reserve(
            $fulfillment,
            $bus->id,
            $driver->id,
            $start,
            $end,
            $order->order_number
        );

        return [$agent, $item->fresh(['order.invoice', 'fulfillment']), $fulfillment];
    }

    private function bus(string $plate): Bus
    {
        return Bus::create([
            'plate_number' => $plate,
            'model' => 'Tour Coach',
            'vehicle_type' => 'bus',
            'seating_capacity' => 49,
            'status' => 'available',
        ]);
    }
}
