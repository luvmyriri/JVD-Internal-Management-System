<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\CashBudgetRequest;
use App\Models\CharterBooking;
use App\Models\CharterRatePlan;
use App\Models\Collection;
use App\Models\Contract;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\EducationalTourBooking;
use App\Models\EducationalTourProgram;
use App\Models\EducationalTourVehicle;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerPassenger;
use App\Models\JoinerReservation;
use App\Models\PrivateTourBooking;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesRefund;
use App\Models\Service;
use App\Models\TripTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Transactions360Test extends TestCase
{
    use RefreshDatabase;

    private User $sales;

    private User $accounting;

    private User $officeStaff;

    private User $driver;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sales = User::factory()->create(['role' => 'reservation_officer']);
        $this->accounting = User::factory()->create(['role' => 'accounting_executive']);
        $this->officeStaff = User::factory()->create(['role' => 'office_staff']);
        $this->driver = User::factory()->create(['role' => 'driver']);
        $this->customer = Customer::factory()->create([
            'first_name' => 'Tala',
            'last_name' => 'Santos',
            'email' => 'tala.transactions360@example.test',
            'phone' => '09170000360',
        ]);
    }

    public function test_transaction_reads_are_private_and_available_to_sales_and_accounting_roles(): void
    {
        $invoice = $this->createLegacyInvoice('INV-TXN360-ACCESS');

        $this->getJson('/api/v1/transactions')->assertUnauthorized();

        $this->actingAs($this->driver)
            ->getJson('/api/v1/transactions')
            ->assertForbidden();

        foreach ([$this->sales, $this->accounting] as $reader) {
            $this->actingAs($reader)
                ->getJson('/api/v1/transactions?search='.$invoice->invoice_number)
                ->assertOk()
                ->assertJsonPath('meta.total', 1)
                ->assertJsonPath('data.0.invoice.id', $invoice->id);

            $this->actingAs($reader)
                ->getJson("/api/v1/transactions/{$invoice->id}")
                ->assertOk()
                ->assertJsonPath('data.invoice.id', $invoice->id);
        }
    }

    public function test_customer_sales_are_the_default_and_cash_budget_disbursements_require_an_explicit_kind(): void
    {
        $graph = $this->createRepresentativeGraph();
        $internal = $graph['cash_budget'];

        $default = $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?per_page=100')
            ->assertOk();

        $this->assertSame(4, $default->json('meta.total'));
        $this->assertNotContains($internal->id, collect($default->json('data'))->pluck('invoice.id')->all());
        $this->assertSame(['sales'], collect($default->json('data'))->pluck('kind')->unique()->values()->all());

        $this->actingAs($this->sales)
            ->getJson('/api/v1/transactions?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 4);

        foreach ([$this->sales, $this->officeStaff] as $nonAccountingReader) {
            foreach (['all', 'cash_budget_disbursement'] as $restrictedKind) {
                $this->actingAs($nonAccountingReader)
                    ->getJson('/api/v1/transactions?kind='.$restrictedKind)
                    ->assertForbidden();
            }
        }

        $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?kind=cash_budget_disbursement')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.kind', 'cash_budget_disbursement')
            ->assertJsonPath('data.0.invoice.id', $internal->id);

        $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?kind=all&per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);

        $this->actingAs($this->accounting)
            ->getJson("/api/v1/transactions/{$internal->id}")
            ->assertOk()
            ->assertJsonPath('data.kind', 'cash_budget_disbursement');

        foreach ([$this->sales, $this->officeStaff] as $nonAccountingReader) {
            $this->actingAs($nonAccountingReader)
                ->getJson("/api/v1/transactions/{$internal->id}")
                ->assertForbidden();
        }

        $this->actingAs($this->accounting)
            ->getJson("/api/v1/transactions/{$internal->id}?kind=all")
            ->assertOk()
            ->assertJsonPath('data.kind', 'cash_budget_disbursement');
    }

    public function test_four_sales_engines_and_multi_item_products_have_stable_list_projections(): void
    {
        $graph = $this->createRepresentativeGraph();

        $expectations = [
            'fixed' => ['Fixed Package: Baguio Family Escape', 2, 'private_tour', 'private_tour'],
            'joiner' => ['Joiner: Sagada Weekend', 1, 'joiner_tour', 'joiner_tour'],
            'charter' => ['Charter: Executive Bus Daily', 1, 'bus_rental', 'bus_rental'],
            'educational' => ['Educational: Science Discovery Program', 1, 'educational_tour', 'educational_tour'],
        ];

        foreach ($expectations as $key => [$primaryName, $itemCount, $serviceType, $bookingType]) {
            /** @var Invoice $invoice */
            $invoice = $graph[$key];
            $row = $this->transactionRow($invoice);

            $this->assertSame('sales', $row['kind']);
            $this->assertSame($primaryName, $row['product']['primary_name']);
            $this->assertSame($itemCount, $row['product']['item_count']);
            $this->assertContains($serviceType, $row['product']['service_types']);
            $this->assertSame($bookingType, $row['booking']['type']);
            $this->assertSame($invoice->id, $row['identifiers']['invoice_id']);
            $this->assertSame($invoice->salesOrder->id, $row['identifiers']['sales_order_id']);
            $this->assertSame($invoice->collection->id, $row['identifiers']['collection_id']);
            $this->assertSame($invoice->id, $row['navigation']['transaction']['params']['invoice_id']);
        }

        $fixed = $this->transactionRow($graph['fixed']);
        $this->assertSame(
            ['Fixed Package: Baguio Family Escape', 'Travel Insurance Add-on'],
            collect($fixed['product']['items'])->pluck('name')->all()
        );
        $this->assertTrue($fixed['contract']['required']);
        $this->assertSame('signed', $fixed['contract']['status']);
        $this->assertSame($graph['fixed']->contract->id, $fixed['contract']['id']);
    }

    public function test_posted_payments_are_the_financial_truth_and_refund_math_is_evidence_based(): void
    {
        $graph = $this->createRepresentativeGraph();

        $joiner = $this->transactionRow($graph['joiner']);
        $this->assertSame(3000.0, (float) $joiner['money']['gross_collected']);
        $this->assertSame(3000.0, (float) $joiner['money']['net_collected']);
        $this->assertSame(6000.0, (float) $joiner['money']['balance']);
        $this->assertSame('posted_payments', $joiner['money']['evidence_source']);

        $education = $this->transactionRow($graph['educational']);
        $this->assertSame(20000.0, (float) $education['money']['gross_collected']);
        $this->assertSame(8000.0, (float) $education['money']['refunded']);
        $this->assertSame(12000.0, (float) $education['money']['net_collected']);
        $this->assertSame(12000.0, (float) $education['refund']['available_amount']);
        $this->assertSame(1, $education['refund']['count']);
        $this->assertSame('processed', $education['refund']['latest_status']);

        $stats = $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?per_page=100')
            ->assertOk()
            ->json('stats');

        $this->assertSame(4, $stats['transaction_count']);
        $this->assertSame(8000.0, (float) $stats['refunded']);
        $this->assertSame(
            (float) ($stats['gross_collected'] - $stats['refunded']),
            (float) $stats['net_collected']
        );
    }

    public function test_representative_cross_engine_list_has_a_bounded_query_count(): void
    {
        $this->createRepresentativeGraph();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?per_page=100');
        $queryCount = count(DB::getQueryLog());

        DB::disableQueryLog();

        $response
            ->assertOk()
            ->assertJsonPath('meta.total', 4);
        $this->assertLessThanOrEqual(
            40,
            $queryCount,
            "Transactions 360 list executed {$queryCount} queries for four heterogeneous sales engines."
        );
    }

    public function test_search_filters_and_pagination_are_validated_and_composable(): void
    {
        $graph = $this->createRepresentativeGraph();
        $charter = $graph['charter'];

        $this->actingAs($this->sales)
            ->getJson('/api/v1/transactions?'.http_build_query([
                'search' => 'CHR-TXN360-001',
                'service_type' => 'bus_rental',
                'payment_method' => 'GCash',
                'payment_type' => 'downpayment',
                'collection_status' => 'partial',
                'contract_status' => 'sent_for_signature',
                'date_from' => now()->subDay()->toDateString(),
                'date_to' => now()->addDay()->toDateString(),
                'page' => 1,
                'per_page' => 1,
            ]))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('data.0.invoice.id', $charter->id);

        foreach ([
            ['date_from' => now()->subDay()->toDateString()],
            ['date_to' => now()->addDay()->toDateString()],
        ] as $oneSidedDateRange) {
            $this->actingAs($this->accounting)
                ->getJson('/api/v1/transactions?'.http_build_query($oneSidedDateRange))
                ->assertOk()
                ->assertJsonPath('meta.total', 4);
        }

        $graph['joiner']->update(['payment_method' => 'Cash']);
        $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?'.http_build_query([
                'search' => $graph['joiner']->invoice_number,
                'payment_method' => 'GCash',
            ]))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.invoice.id', $graph['joiner']->id)
            ->assertJsonPath('data.0.money.payment_methods.0', 'GCash');

        foreach ([
            ['status' => 'fabricated'],
            ['kind' => 'expense'],
            ['date_from' => 'not-a-date'],
            ['date_from' => '2026-08-15', 'date_to' => '2026-08-14'],
            ['page' => 0],
            ['per_page' => 101],
        ] as $query) {
            $this->actingAs($this->accounting)
                ->getJson('/api/v1/transactions?'.http_build_query($query))
                ->assertUnprocessable();
        }
    }

    public function test_detail_contains_safe_payment_refund_passenger_ticket_and_navigation_context(): void
    {
        $graph = $this->createRepresentativeGraph();

        $joiner = $this->transactionDetail($graph['joiner']);
        $this->assertCount(1, $joiner['payments']);
        $this->assertSame('pay_txn360_joiner', $joiner['payments'][0]['paymongo_payment_id']);
        $this->assertArrayNotHasKey('idempotency_key', $joiner['payments'][0]);
        $this->assertCount(2, $joiner['passengers']);
        $this->assertSame(['J1', 'J2'], collect($joiner['passengers'])->pluck('seat_code')->sort()->values()->all());
        $this->assertSame($graph['joiner']->joinerReservation->departure_id, $joiner['navigation']['engine']['params']['departure_id']);

        $charter = $this->transactionDetail($graph['charter']);
        $this->assertSame('cs_txn360_charter', $charter['provider']['invoice_payment_id']);
        $this->assertSame('pay_txn360_charter', $charter['payments'][0]['paymongo_payment_id']);
        $this->assertCount(1, $charter['trip_tickets']);
        $this->assertSame('DTT-TXN360-CHR', $charter['trip_tickets'][0]['control_no']);
        $this->assertSame($graph['charter']->charterBooking->id, $charter['navigation']['engine']['params']['booking_id']);

        $education = $this->transactionDetail($graph['educational']);
        $this->assertCount(1, $education['refunds']);
        $this->assertSame('ref_txn360_education', $education['refunds'][0]['provider_refund_id']);
        $this->assertArrayNotHasKey('provider_error', $education['refunds'][0]);
        $this->assertArrayNotHasKey('destination_reference', $education['refunds'][0]);
        $this->assertSame($graph['educational']->educationalTourBooking->program_id, $education['navigation']['engine']['params']['program_id']);
        $this->assertSame($graph['educational']->educationalTourBooking->id, $education['identifiers']['booking_id']);
    }

    public function test_legacy_invoice_without_an_order_is_read_without_mutating_the_database(): void
    {
        $legacy = $this->createLegacyInvoice('INV-TXN360-LEGACY');
        $migratedPending = $this->invoice(
            'INV-TXN360-MIGRATED-PENDING',
            2200,
            0,
            0,
            'pending',
            'Cash',
            'full',
            ['amount_received' => null]
        );
        $migratedCancelled = $this->invoice(
            'INV-TXN360-MIGRATED-CANCELLED',
            1800,
            0,
            0,
            'cancelled',
            'Cash',
            'full',
            ['amount_received' => null]
        );
        $migratedPaid = $this->invoice(
            'INV-TXN360-MIGRATED-PAID',
            3200,
            0,
            0,
            'paid',
            'Cash',
            'full',
            ['amount_received' => null]
        );
        $before = SalesOrder::count();

        $this->actingAs($this->sales)
            ->getJson('/api/v1/transactions?search='.$legacy->invoice_number)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.order', null)
            ->assertJsonPath('data.0.documents.invoice', false)
            ->assertJsonPath('data.0.documents.manifest', false);

        $this->actingAs($this->sales)
            ->getJson("/api/v1/transactions/{$legacy->id}")
            ->assertOk()
            ->assertJsonPath('data.order', null)
            ->assertJsonPath('data.documents.quotation', false)
            ->assertJsonPath('data.documents.contract', false);

        $migratedPendingRow = $this->transactionRow($migratedPending);
        $this->assertSame(0.0, (float) $migratedPendingRow['money']['gross_collected']);
        $this->assertSame(0.0, (float) $migratedPendingRow['money']['net_collected']);
        $this->assertSame(2200.0, (float) $migratedPendingRow['money']['balance']);
        $this->assertSame('unpaid', $migratedPendingRow['payment_state']);
        $this->assertSame('none', $migratedPendingRow['money']['evidence_source']);

        $migratedCancelledRow = $this->transactionRow($migratedCancelled);
        $this->assertSame(0.0, (float) $migratedCancelledRow['money']['gross_collected']);
        $this->assertSame(0.0, (float) $migratedCancelledRow['money']['net_collected']);
        $this->assertSame(1800.0, (float) $migratedCancelledRow['money']['balance']);
        $this->assertSame('unpaid', $migratedCancelledRow['payment_state']);

        $migratedPaidRow = $this->transactionRow($migratedPaid);
        $this->assertSame(3200.0, (float) $migratedPaidRow['money']['gross_collected']);
        $this->assertSame(3200.0, (float) $migratedPaidRow['money']['net_collected']);
        $this->assertSame(0.0, (float) $migratedPaidRow['money']['balance']);
        $this->assertSame('paid', $migratedPaidRow['payment_state']);
        $this->assertSame('legacy_invoice_balance', $migratedPaidRow['money']['evidence_source']);

        $this->assertSame($before, SalesOrder::count(), 'A GET request must never backfill a missing sales order.');
    }

    private function transactionRow(Invoice $invoice): array
    {
        return $this->actingAs($this->accounting)
            ->getJson('/api/v1/transactions?search='.$invoice->invoice_number)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->json('data.0');
    }

    private function transactionDetail(Invoice $invoice): array
    {
        return $this->actingAs($this->accounting)
            ->getJson("/api/v1/transactions/{$invoice->id}")
            ->assertOk()
            ->json('data');
    }

    /** @return array{fixed: Invoice, joiner: Invoice, charter: Invoice, educational: Invoice, cash_budget: Invoice} */
    private function createRepresentativeGraph(): array
    {
        $fixed = $this->createFixedPackageTransaction();
        $joiner = $this->createJoinerTransaction();
        $charter = $this->createCharterTransaction();
        $educational = $this->createEducationalTransaction();

        $budget = CashBudgetRequest::create([
            'date' => now()->toDateString(),
            'destination' => 'Internal operations demo',
            'status' => 'disbursed',
            'total_amount' => 4000,
            'disbursed_amount' => 4000,
            'prepared_by' => $this->accounting->id,
        ]);
        $internal = Invoice::create([
            'invoice_number' => 'INV-TXN360-INTERNAL',
            'customer_name' => 'Internal Cash Budget',
            'subtotal' => 4000,
            'tax_amount' => 0,
            'total_amount' => 4000,
            'amount_received' => 4000,
            'balance' => 0,
            'status' => 'disbursed_budget',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'cash_budget_request_id' => $budget->id,
            'created_by' => $this->accounting->id,
        ]);

        return compact('fixed', 'joiner', 'charter', 'educational') + ['cash_budget' => $internal];
    }

    private function createFixedPackageTransaction(): Invoice
    {
        $bus = Bus::factory()->create(['plate_number' => 'FIX-360', 'status' => 'available']);
        $driver = User::factory()->create(['role' => 'driver']);
        $service = $this->service('Fixed Package: Baguio Family Escape', 'private_tour', 25000);
        $addOn = $this->service('Travel Insurance Add-on', 'custom_arrangement', 3000);
        $invoice = $this->invoice('INV-TXN360-FIXED', 28000, 28000, 0, 'paid', 'Cash', 'full', [
            'requires_contract' => true,
            'contract_gate_status' => 'signed',
        ]);
        $firstInvoiceItem = $this->invoiceItem($invoice, $service, 25000);
        $secondInvoiceItem = $this->invoiceItem($invoice, $addOn, 3000);
        $order = $this->order($invoice, 'ORD-TXN360-FIXED', 28000, 28000, 0, 'confirmed');
        $first = $this->orderItem($order, $firstInvoiceItem, $service, 1);
        $this->orderItem($order, $secondInvoiceItem, $addOn, 2);
        $fulfillment = PrivateTourBooking::create([
            'sales_order_item_id' => $first->id,
            'originating_catalog_service_id' => $service->id,
            'status' => 'confirmed',
            'package_name' => $service->name,
            'destination' => 'Baguio City',
            'starts_at' => now()->addMonths(2),
            'ends_at' => now()->addMonths(2)->addDays(3),
            'passenger_count' => 4,
            'adult_count' => 2,
            'child_count' => 2,
            'adult_rate' => 7000,
            'child_rate' => 5500,
            'traveler_types' => [
                ['name' => 'Tala Santos', 'type' => 'adult'],
                ['name' => 'Mika Santos', 'type' => 'child'],
            ],
            'pickup_location' => 'JVD Main Office',
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'itinerary' => [['day' => 1, 'title' => 'Baguio city tour']],
        ]);
        $first->update(['fulfillment_type' => $fulfillment->getMorphClass(), 'fulfillment_id' => $fulfillment->id]);
        Contract::create([
            'invoice_id' => $invoice->id,
            'contract_number' => 'CTR-TXN360-FIXED',
            'status' => 'signed',
            'terms_snapshot' => 'Transactions 360 fixed-package demo terms.',
            'created_by' => $this->sales->id,
            'signature_typed_name' => 'Tala Santos',
            'signed_at' => now(),
        ]);
        $this->collection($invoice, 28000, 28000, 0, 'completed', [
            ['method' => 'Cash', 'amount' => 28000, 'provider_id' => null],
        ]);

        return $invoice->fresh();
    }

    private function createJoinerTransaction(): Invoice
    {
        $service = $this->service('Joiner: Sagada Weekend', 'joiner_tour', 4500);
        $invoice = $this->invoice('INV-TXN360-JOINER', 9000, 1, 8999, 'partial', 'GCash', 'downpayment');
        $invoiceItem = $this->invoiceItem($invoice, $service, 9000, 2);
        $order = $this->order($invoice, 'ORD-TXN360-JOINER', 9000, 1, 8999, 'awaiting_payment');
        $line = $this->orderItem($order, $invoiceItem, $service, 1, 2);
        $departure = JoinerDeparture::create([
            'service_id' => $service->id,
            'code' => 'DEP-TXN360-SAGADA',
            'starts_at' => now()->addMonths(3),
            'ends_at' => now()->addMonths(3)->addDays(3),
            'booking_cutoff_at' => now()->addMonths(3)->subDay(),
            'capacity' => 20,
            'confirmed_count' => 2,
            'status' => 'scheduled',
            'created_by' => $this->sales->id,
        ]);
        $reservation = JoinerReservation::create([
            'departure_id' => $departure->id,
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'reference' => 'JNR-TXN360-001',
            'lead_name' => 'Tala Santos',
            'lead_email' => $this->customer->email,
            'lead_contact' => $this->customer->phone,
            'passenger_count' => 2,
            'status' => 'confirmed',
            'created_by' => $this->sales->id,
        ]);
        foreach ([['J1', 'Tala', 'Santos', 'adult'], ['J2', 'Mika', 'Santos', 'child']] as [$code, $first, $last, $type]) {
            $seat = JoinerDepartureSeat::create([
                'departure_id' => $departure->id,
                'reservation_id' => $reservation->id,
                'seat_code' => $code,
                'status' => 'confirmed',
            ]);
            JoinerPassenger::create([
                'reservation_id' => $reservation->id,
                'departure_seat_id' => $seat->id,
                'first_name' => $first,
                'last_name' => $last,
                'passenger_type' => $type,
                'emergency_contact' => '09170000360',
            ]);
        }
        $line->update(['fulfillment_type' => $reservation->getMorphClass(), 'fulfillment_id' => $reservation->id]);
        $this->collection($invoice, 9000, 1, 8999, 'partial', [
            ['method' => 'GCash', 'amount' => 3000, 'provider_id' => 'pay_txn360_joiner'],
        ]);

        return $invoice->fresh();
    }

    private function createCharterTransaction(): Invoice
    {
        $bus = Bus::factory()->create([
            'plate_number' => 'CHR-360',
            'status' => 'available',
            'seating_capacity' => 49,
            'vehicle_type' => 'bus',
        ]);
        $driver = User::factory()->create(['role' => 'driver']);
        $service = $this->service('Charter: Executive Bus Daily', 'bus_rental', 25000);
        $plan = CharterRatePlan::create([
            'service_id' => $service->id,
            'name' => 'Charter: Executive Bus Daily',
            'vehicle_class' => 'bus',
            'base_price' => 25000,
            'included_hours' => 10,
            'included_kilometers' => 100,
            'is_active' => true,
            'created_by' => $this->sales->id,
        ]);
        $invoice = $this->invoice('INV-TXN360-CHARTER', 25000, 5000, 20000, 'partial', 'GCash', 'downpayment', [
            'payment_id' => 'cs_txn360_charter',
            'requires_contract' => true,
            'contract_gate_status' => 'sent_for_signature',
        ]);
        $invoiceItem = $this->invoiceItem($invoice, $service, 25000);
        $order = $this->order($invoice, 'ORD-TXN360-CHARTER', 25000, 5000, 20000, 'awaiting_payment');
        $line = $this->orderItem($order, $invoiceItem, $service, 1, 20);
        $booking = CharterBooking::create([
            'reference' => 'CHR-TXN360-001',
            'rate_plan_id' => $plan->id,
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'lead_name' => 'Tala Santos',
            'lead_email' => $this->customer->email,
            'lead_contact' => $this->customer->phone,
            'starts_at' => now()->addMonths(4),
            'ends_at' => now()->addMonths(4)->addDay(),
            'pickup_location' => 'JVD Main Office',
            'destination' => 'Subic Bay',
            'passenger_count' => 20,
            'passengers' => [['first_name' => 'Tala', 'last_name' => 'Santos', 'seat_code' => '1A']],
            'estimated_kilometers' => 280,
            'base_price' => 25000,
            'subtotal' => 25000,
            'pricing_snapshot' => ['rate_plan_id' => $plan->id],
            'status' => 'confirmed',
            'created_by' => $this->sales->id,
        ]);
        $line->update(['fulfillment_type' => $booking->getMorphClass(), 'fulfillment_id' => $booking->id]);
        Contract::create([
            'invoice_id' => $invoice->id,
            'contract_number' => 'CTR-TXN360-CHARTER',
            'status' => 'sent_for_signature',
            'terms_snapshot' => 'Transactions 360 charter demo terms.',
            'created_by' => $this->sales->id,
            'sent_at' => now(),
        ]);
        $this->collection($invoice, 25000, 5000, 20000, 'partial', [
            ['method' => 'GCash', 'amount' => 5000, 'provider_id' => 'pay_txn360_charter'],
        ]);
        TripTicket::withoutEvents(function () use ($invoice, $line, $bus, $driver): void {
            TripTicket::create([
                'control_no' => 'DTT-TXN360-CHR',
                'issue_date' => now()->toDateString(),
                'date_of_travel' => now()->addMonths(4)->toDateString(),
                'duration' => '1 day',
                'pick_up' => 'JVD Main Office',
                'drop_off' => 'Subic Bay',
                'bus_id' => $bus->id,
                'plate_no' => $bus->plate_number,
                'no_of_passengers' => 20,
                'driver_id' => $driver->id,
                'requested_by' => $this->sales->id,
                'status' => 'draft',
                'invoice_id' => $invoice->id,
                'sales_order_item_id' => $line->id,
                'assignment_index' => 0,
            ]);
        });

        return $invoice->fresh();
    }

    private function createEducationalTransaction(): Invoice
    {
        $bus = Bus::factory()->create(['plate_number' => 'EDU-360', 'status' => 'available', 'seating_capacity' => 49]);
        $driver = User::factory()->create(['role' => 'driver']);
        $service = $this->service('Educational: Science Discovery Program', 'educational_tour', 50000);
        $program = EducationalTourProgram::create([
            'name' => 'Educational: Science Discovery Program',
            'learning_objectives' => 'Applied science and museum learning.',
            'default_stops' => ['Science Museum', 'Planetarium'],
            'minimum_students' => 20,
            'students_per_chaperone' => 20,
            'students_per_free_chaperone' => 20,
            'student_price' => 1000,
            'additional_chaperone_price' => 500,
            'is_active' => true,
            'created_by' => $this->sales->id,
        ]);
        DB::table('educational_tour_programs')->where('id', $program->id)->update(['service_id' => $service->id]);
        $invoice = $this->invoice('INV-TXN360-EDUCATION', 50000, 20000, 0, 'cancelled', 'GCash', 'downpayment', [
            'credited_amount' => 20000,
            'refunded_amount' => 8000,
        ]);
        $invoiceItem = $this->invoiceItem($invoice, $service, 50000);
        $order = $this->order($invoice, 'ORD-TXN360-EDUCATION', 50000, 20000, 0, 'cancelled');
        $line = $this->orderItem($order, $invoiceItem, $service, 1, 42);
        $booking = EducationalTourBooking::create([
            'reference' => 'EDU-TXN360-001',
            'program_id' => $program->id,
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'school_name' => 'Transactions 360 Academy',
            'contact_person' => 'Tala Santos',
            'contact_email' => $this->customer->email,
            'contact_number' => $this->customer->phone,
            'grade_level' => 'Grade 10',
            'starts_at' => now()->addMonths(5),
            'ends_at' => now()->addMonths(5)->addDay(),
            'pickup_location' => 'School Campus',
            'stops_snapshot' => ['Science Museum', 'Planetarium'],
            'student_count' => 40,
            'chaperone_count' => 2,
            'passengers' => [['first_name' => 'Student', 'last_name' => 'One', 'seat_code' => 'EDU-1A']],
            'free_chaperone_count' => 2,
            'chargeable_chaperone_count' => 0,
            'student_amount' => 40000,
            'chaperone_amount' => 0,
            'subtotal' => 50000,
            'pricing_snapshot' => ['program_id' => $program->id],
            'status' => 'cancelled',
            'created_by' => $this->sales->id,
        ]);
        EducationalTourVehicle::create([
            'booking_id' => $booking->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'capacity_snapshot' => 49,
            'planned_passengers' => 42,
        ]);
        $line->update(['fulfillment_type' => $booking->getMorphClass(), 'fulfillment_id' => $booking->id]);
        $this->collection($invoice, 50000, 20000, 0, 'completed', [
            ['method' => 'GCash', 'amount' => 20000, 'provider_id' => 'pay_txn360_education'],
        ]);
        $credit = CreditNote::create([
            'credit_note_number' => 'CN-TXN360-EDUCATION',
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'status' => 'posted',
            'subtotal' => 20000,
            'tax_amount' => 0,
            'total_amount' => 20000,
            'reason' => 'Approved educational tour cancellation.',
            'issued_by' => $this->accounting->id,
            'issued_at' => now(),
            'posted_at' => now(),
        ]);
        SalesRefund::create([
            'refund_number' => 'REF-TXN360-EDUCATION',
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'credit_note_id' => $credit->id,
            'status' => 'processed',
            'amount' => 8000,
            'refund_method' => 'PayMongo',
            'reason' => 'Partial cancellation refund.',
            'requested_by' => $this->sales->id,
            'approved_by' => $this->accounting->id,
            'processed_by' => $this->accounting->id,
            'destination_reference' => 'customer-wallet-redacted',
            'provider_refund_id' => 'ref_txn360_education',
            'provider_status' => 'succeeded',
            'provider_error' => 'internal provider diagnostic must never be exposed',
            'approved_at' => now(),
            'processed_at' => now(),
        ]);

        return $invoice->fresh();
    }

    private function createLegacyInvoice(string $number): Invoice
    {
        $invoice = $this->invoice($number, 1750, 0, 1750, 'pending_payment', 'Cash', 'full');
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => null,
            'item_name' => 'Legacy custom travel service',
            'service_type' => 'custom_arrangement',
            'quantity' => 1,
            'unit_price' => 1750,
            'total_price' => 1750,
        ]);

        return $invoice->fresh();
    }

    private function service(string $name, string $type, float $price): Service
    {
        return Service::create([
            'name' => $name,
            'description' => $name.' description',
            'category' => str_replace('_', ' ', $type),
            'service_type' => $type,
            'price' => $price,
            'is_active' => true,
            'is_sales_catalog' => true,
            'created_by' => $this->sales->id,
        ]);
    }

    private function invoice(
        string $number,
        float $total,
        float $headerPaid,
        float $headerBalance,
        string $status,
        string $paymentMethod,
        string $paymentType,
        array $overrides = []
    ): Invoice {
        return Invoice::create(array_merge([
            'invoice_number' => $number,
            'customer_id' => $this->customer->id,
            'customer_name' => 'Tala Santos',
            'customer_email' => $this->customer->email,
            'customer_contact' => $this->customer->phone,
            'subtotal' => $total,
            'tax_amount' => 0,
            'total_amount' => $total,
            'amount_received' => $headerPaid,
            'balance' => $headerBalance,
            'credited_amount' => 0,
            'refunded_amount' => 0,
            'status' => $status,
            'payment_method' => $paymentMethod,
            'payment_type' => $paymentType,
            'due_date' => now()->addMonth()->toDateString(),
            'created_by' => $this->sales->id,
        ], $overrides));
    }

    private function invoiceItem(Invoice $invoice, Service $service, float $amount, int $quantity = 1): InvoiceItem
    {
        return InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'item_name' => $service->name,
            'service_type' => $service->service_type,
            'quantity' => $quantity,
            'unit_price' => $amount / $quantity,
            'total_price' => $amount,
        ]);
    }

    private function order(
        Invoice $invoice,
        string $number,
        float $total,
        float $headerPaid,
        float $headerBalance,
        string $status
    ): SalesOrder {
        return SalesOrder::create([
            'order_number' => $number,
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'agent_id' => $this->sales->id,
            'status' => $status,
            'currency' => 'PHP',
            'subtotal' => $total,
            'tax_amount' => 0,
            'total_amount' => $total,
            'amount_paid' => $headerPaid,
            'balance' => $headerBalance,
        ]);
    }

    private function orderItem(
        SalesOrder $order,
        InvoiceItem $invoiceItem,
        Service $service,
        int $lineNumber,
        ?int $travelerCount = null
    ): SalesOrderItem {
        return SalesOrderItem::create([
            'sales_order_id' => $order->id,
            'line_number' => $lineNumber,
            'service_type' => $service->service_type,
            'service_id' => $service->id,
            'status' => $order->status === 'cancelled' ? 'cancelled' : 'confirmed',
            'title' => $invoiceItem->item_name,
            'quantity' => $invoiceItem->quantity,
            'unit_price' => $invoiceItem->unit_price,
            'subtotal' => $invoiceItem->total_price,
            'tax_amount' => 0,
            'total_amount' => $invoiceItem->total_price,
            'traveler_count' => $travelerCount,
        ]);
    }

    /** @param array<int, array{method: string, amount: float|int, provider_id: ?string}> $payments */
    private function collection(
        Invoice $invoice,
        float $billing,
        float $stalePaid,
        float $staleBalance,
        string $status,
        array $payments
    ): Collection {
        $collection = Collection::create([
            'invoice_id' => $invoice->id,
            'customer_id' => $this->customer->id,
            'client_name' => $invoice->customer_name,
            'service_type' => 'Tour Package',
            'date' => now()->toDateString(),
            'travel_date' => now()->addMonths(2)->toDateString(),
            'rate' => $billing,
            'billing_amount' => $billing,
            'paid_amount' => $stalePaid,
            'remaining_balance' => $staleBalance,
            'due_date' => $invoice->due_date,
            'collection_status' => $status,
            'auto_generated' => true,
        ]);

        foreach ($payments as $index => $payment) {
            $collection->payments()->create([
                'payment_date' => now()->toDateString(),
                'payment_method' => $payment['method'],
                'amount' => $payment['amount'],
                'balance' => max(0, $billing - collect($payments)->take($index + 1)->sum('amount')),
                'idempotency_key' => "txn360-secret-{$invoice->id}-{$index}",
                'paymongo_payment_id' => $payment['provider_id'],
            ]);
        }

        return $collection;
    }
}
