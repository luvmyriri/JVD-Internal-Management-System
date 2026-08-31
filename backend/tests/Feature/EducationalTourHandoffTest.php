<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Customer;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\EducationalTourProgram;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\TripTicket;
use App\Models\User;
use App\Services\EducationalTourPackageService;
use App\Services\EducationalTourPaymentService;
use App\Services\EducationalTourRegistrationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EducationalTourHandoffTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $driver;

    private Bus $bus;

    private Customer $customer;

    private EducationalTourProgram $program;

    private EducationalTourPackage $package;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@jvd.com',
            'must_change_password' => false,
        ]);

        $this->driver = User::factory()->create([
            'role' => 'driver',
            'first_name' => 'Eduardo',
            'last_name' => 'Deblios',
            'email' => 'eduardo.deblios@jvd.com',
            'phone' => '+639171112222',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->bus = Bus::create([
            'plate_number' => 'APA 4526',
            'model' => 'Golden Dragon 49-Seater',
            'seating_capacity' => 49,
            'status' => 'available',
            'vehicle_type' => 'bus',
        ]);

        $this->customer = Customer::create([
            'first_name' => 'Browser QA',
            'last_name' => 'Academy',
            'email' => 'contact@bqa.edu.ph',
            'phone' => '+639179998888',
        ]);

        $this->program = EducationalTourProgram::create([
            'name' => 'Historic Manila & Heritage Sites',
            'student_price' => 2400.00,
            'default_stops' => ['Intramuros', 'National Museum'],
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'tour_code' => 'JVD-EDT-BROWSER--2026-003',
            'name' => 'Browser QA Educational Tour 082526-01',
            'school_customer_id' => $this->customer->id,
            'school_name' => 'Browser QA Academy',
            'program_id' => $this->program->id,
            'grade_level' => 'Grade 10',
            'starts_at' => Carbon::parse('2026-08-25 07:00:00')->toDateTimeString(),
            'ends_at' => Carbon::parse('2026-08-25 18:00:00')->toDateTimeString(),
            'pickup_location' => 'Browser QA Academy Main Gate',
            'rate_per_head' => 2400.00,
            'vat_rate' => 0.12,
            'is_tax_inclusive' => true,
            'maximum_capacity' => 49,
            'payment_policy' => 'full_or_down_payment',
            'down_payment_amount' => 800.00,
            'status' => 'published',
            'bus_assignments' => [
                [
                    'bus_id' => $this->bus->id,
                    'driver_id' => $this->driver->id,
                ],
            ],
        ], $this->admin->id);

        $this->package = $result['package'];
    }

    public function test_package_bus_assignment_owns_one_named_ticket_while_participant_checkout_only_updates_pax(): void
    {
        $assignment = $this->package->busAssignments()->firstOrFail();
        $ticket = TripTicket::where('educational_tour_bus_assignment_id', $assignment->id)->firstOrFail();

        $this->assertEquals('Browser QA Educational Tour 082526-01', $ticket->tour_name);
        $this->assertEquals('JVD-EDT-BROWSER--2026-003', $ticket->tour_code);
        $this->assertEquals(0, $ticket->no_of_passengers);

        $registration = app(EducationalTourRegistrationService::class);
        foreach ([1, 2] as $student) {
            $registration->registerParticipantForPackage($this->package, [
                'booking_reference' => "EDT-DTT-{$student}",
                'participant' => [
                    'first_name' => "Student{$student}",
                    'last_name' => 'DTT',
                    'student_number' => "DTT-{$student}",
                    'grade_level' => 'Grade 10',
                    'email' => "student{$student}@bqa.edu.ph",
                    'seat_number' => "Seat {$student}",
                    'allocation_mode' => 'manual',
                    'bus_assignment_id' => $assignment->id,
                ],
                'guardian' => [
                    'name' => "Guardian {$student}",
                    'email' => "guardian{$student}@bqa.edu.ph",
                ],
                'payment_plan' => 'full',
            ], $this->admin->id);
        }

        $this->assertDatabaseCount('trip_tickets', 1);
        $ticket->refresh();
        $this->assertEquals(2, $ticket->no_of_passengers);
        $this->assertNull($ticket->invoice_id);
        $this->assertNull($ticket->sales_order_item_id);
    }

    public function test_package_edits_without_assignment_ids_update_the_same_trip_ticket(): void
    {
        $service = app(EducationalTourPackageService::class);
        $assignment = $this->package->busAssignments()->firstOrFail();
        $ticket = TripTicket::where('educational_tour_package_id', $this->package->id)->firstOrFail();
        $originalTicketId = $ticket->id;
        $originalControlNumber = $ticket->control_no;

        $ticket->update([
            'status' => 'approved',
            'approved_by' => $this->admin->id,
        ]);

        // This is the payload shape used by older edit clients: the stable bus
        // position is present, but the database assignment ID is not.
        $service->updatePackage($this->package, [
            'name' => 'Revised Browser QA Educational Tour',
            'pickup_location' => 'Revised School Assembly Gate',
            'bus_assignments' => [[
                'bus_id' => $this->bus->id,
                'driver_id' => $this->driver->id,
                'sequence_number' => 1,
            ]],
        ]);

        $this->assertSame(1, $this->package->busAssignments()->count());
        $this->assertSame(1, TripTicket::where('educational_tour_package_id', $this->package->id)->count());

        $ticket->refresh();
        $this->assertSame($originalTicketId, $ticket->id);
        $this->assertSame($originalControlNumber, $ticket->control_no);
        $this->assertSame($assignment->id, $ticket->educational_tour_bus_assignment_id);
        $this->assertSame('Revised Browser QA Educational Tour', $ticket->tour_name);
        $this->assertSame('Revised School Assembly Gate', $ticket->pick_up);
        $this->assertSame('draft', $ticket->status, 'Operational changes must return an approved ticket for re-approval.');
        $this->assertNull($ticket->approved_by);

        // A second identical save must remain a no-op for ticket identity.
        $service->updatePackage($this->package->fresh(), [
            'operations_notes' => 'Second desk edit',
            'bus_assignments' => [[
                'bus_id' => $this->bus->id,
                'driver_id' => $this->driver->id,
                'sequence_number' => 1,
            ]],
        ]);

        $this->assertSame(1, $this->package->busAssignments()->count());
        $this->assertSame(1, TripTicket::where('educational_tour_package_id', $this->package->id)->count());
        $this->assertSame($originalTicketId, TripTicket::where('educational_tour_package_id', $this->package->id)->value('id'));
    }

    public function test_replacing_a_bus_assignment_rebinds_the_existing_trip_ticket(): void
    {
        $service = app(EducationalTourPackageService::class);
        $oldAssignment = $this->package->busAssignments()->firstOrFail();
        $ticket = TripTicket::where('educational_tour_package_id', $this->package->id)->firstOrFail();
        $originalTicketId = $ticket->id;
        $originalControlNumber = $ticket->control_no;

        $replacementDriver = User::factory()->create([
            'role' => 'driver',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $replacementBus = Bus::create([
            'plate_number' => 'REPLACEMENT-01',
            'model' => 'Replacement 49-Seater',
            'seating_capacity' => 49,
            'status' => 'available',
            'vehicle_type' => 'bus',
        ]);

        $service->removeBusAssignment($oldAssignment);
        $newAssignment = $service->assignBus($this->package->fresh(), [
            'bus_id' => $replacementBus->id,
            'driver_id' => $replacementDriver->id,
            'sequence_number' => 1,
        ], $this->admin->id);

        $this->assertSame(1, TripTicket::where('educational_tour_package_id', $this->package->id)->count());
        $ticket->refresh();
        $this->assertSame($originalTicketId, $ticket->id);
        $this->assertSame($originalControlNumber, $ticket->control_no);
        $this->assertSame($newAssignment->id, $ticket->educational_tour_bus_assignment_id);
        $this->assertSame($replacementBus->id, $ticket->bus_id);
        $this->assertSame($replacementDriver->id, $ticket->driver_id);
        $this->assertSame('REPLACEMENT-01', $ticket->plate_no);
    }

    public function test_end_to_end_educational_tour_sales_accounting_logistics_driver_handoff(): void
    {
        // 1. Register participant
        $registrationService = app(EducationalTourRegistrationService::class);
        $regResult = $registrationService->registerParticipantForPackage($this->package, [
            'booking_reference' => 'EDT-BROWSER-082526-001',
            'participant' => [
                'first_name' => 'Alpha',
                'last_name' => 'BrowserQA',
                'student_number' => 'BQA-082526-001',
                'grade_level' => 'Grade 10',
                'section' => 'Section 1',
                'date_of_birth' => '2010-05-15',
                'email' => 'alpha@bqa.edu.ph',
                'phone' => '+639171234567',
                'seat_number' => 'Seat 4',
                'allocation_mode' => 'manual',
                'bus_assignment_id' => $this->package->busAssignments()->first()->id,
            ],
            'guardian' => [
                'name' => 'Guardian BrowserQA',
                'email' => 'guardian@bqa.edu.ph',
                'phone' => '+639177654321',
            ],
            'emergency_contact' => [
                'name' => 'Emergency Contact',
                'phone' => '+639170001111',
            ],
            'payment_plan' => 'down_payment',
        ], $this->admin->id);

        $this->assertEquals('EDT-BROWSER-082526-001', $regResult['booking_reference']);
        $this->assertEquals('Seat 4', $regResult['seat_number']);

        /** @var EducationalTourParticipantBooking $booking */
        $booking = EducationalTourParticipantBooking::where('reference', $regResult['booking_reference'])
            ->with(['invoice', 'busAssignment.bus', 'busAssignment.driver'])
            ->first();
        $this->assertNotNull($booking);
        $this->assertEquals('EDT-BROWSER-082526-001', $booking->reference);
        $this->assertEquals('Seat 4', $booking->seat_number);

        /** @var Invoice $invoice */
        $invoice = $booking->invoice;
        $this->assertNotNull($invoice);
        $this->assertEquals(2400.00, (float) $invoice->total_amount);

        // Verify InvoicePassenger was created
        $this->assertDatabaseHas('invoice_passengers', [
            'invoice_id' => $invoice->id,
            'first_name' => 'Alpha',
            'last_name' => 'BrowserQA',
        ]);

        // Verify Trip Ticket exists for Bus and Driver
        $tripTicket = TripTicket::where('bus_id', $this->bus->id)
            ->where('driver_id', $this->driver->id)
            ->first();
        $this->assertNotNull($tripTicket, 'Trip ticket must be generated for the educational tour bus assignment.');
        $this->assertDatabaseCount('trip_tickets', 1);
        $this->assertEquals('APA 4526', $tripTicket->plate_no);
        $this->assertEquals('2026-08-25', $tripTicket->date_of_travel);
        $this->assertEquals($this->package->id, $tripTicket->educational_tour_package_id);
        $this->assertEquals($this->package->busAssignments()->first()->id, $tripTicket->educational_tour_bus_assignment_id);
        $this->assertEquals('Browser QA Educational Tour 082526-01', $tripTicket->tour_name);
        $this->assertEquals('JVD-EDT-BROWSER--2026-003', $tripTicket->tour_code);
        $this->assertEquals(1, $tripTicket->no_of_passengers);
        $this->assertNull($tripTicket->invoice_id, 'A coach DTT must not belong to one participant invoice.');
        $this->assertNull($tripTicket->sales_order_item_id, 'A coach DTT must not belong to one participant sales line.');

        // 2. Accounting Transaction Detail endpoint
        $txResponse = $this->actingAs($this->admin)->getJson("/api/v1/transactions/{$invoice->id}");
        $txResponse->assertOk();

        // The Accounting work queue must be able to eager-load package data without
        // selecting a non-existent destination column from educational packages.
        $this->actingAs($this->admin)
            ->getJson('/api/v1/transactions?search='.urlencode($invoice->invoice_number))
            ->assertOk()
            ->assertJsonPath('data.0.invoice.number', $invoice->invoice_number);
        $txData = $txResponse->json('data');

        // Check booking identity
        $this->assertEquals('educational_tour', $txData['identifiers']['booking_type']);
        $this->assertEquals('EDT-BROWSER-082526-001', $txData['identifiers']['booking_reference']);
        $this->assertEquals('JVD-EDT-BROWSER--2026-003', $txData['booking']['parent_reference']);

        // Check passenger roster
        $this->assertCount(1, $txData['passengers']);
        $this->assertEquals('Alpha BrowserQA', $txData['passengers'][0]['name']);
        $this->assertEquals('Seat 4', $txData['passengers'][0]['seat_code']);

        // Check linked trip tickets
        $this->assertNotEmpty($txData['trip_tickets']);
        $this->assertEquals('APA 4526', $txData['trip_tickets'][0]['vehicle']['plate_number']);
        $this->assertEquals('Eduardo Deblios', $txData['trip_tickets'][0]['driver']['name']);

        // 3. Post Payments (Down Payment + Final Settlement)
        $paymentService = app(EducationalTourPaymentService::class);
        $dpResult = $paymentService->recordPayment($booking, [
            'amount' => 800.00,
            'payment_kind' => 'down_payment',
            'payment_method' => 'Cash',
            'notes' => 'Down payment cash at counter',
        ], $this->admin->id);

        $this->assertFalse($dpResult['duplicate']);
        $booking->refresh();
        $this->assertEquals('partially_paid', $booking->status);

        $finalResult = $paymentService->recordPayment($booking, [
            'amount' => 1600.00,
            'payment_kind' => 'final',
            'payment_method' => 'Cash',
            'notes' => 'Final balance settlement in cash',
        ], $this->admin->id);

        $this->assertFalse($finalResult['duplicate']);
        $booking->refresh();
        $this->assertEquals('confirmed', $booking->status);
        $this->assertEquals('paid', $booking->payment_status);

        // 4. Verify General Ledger Postings
        $journalEntries = JournalEntry::with('ledgerLines')->get();
        $this->assertNotEmpty($journalEntries, 'General ledger journal entries must be recorded.');

        $cashReceiptEntries = $journalEntries->filter(fn ($je) => str_contains($je->notes, 'Payment received for Collection'));
        $this->assertCount(2, $cashReceiptEntries, 'Two cash receipt journal entries must be recorded for the 2 payments.');

        // 5. Verify Accounting Transaction detail after payments
        $txPaidResponse = $this->actingAs($this->admin)->getJson("/api/v1/transactions/{$invoice->id}");
        $txPaidResponse->assertOk();
        $txPaidData = $txPaidResponse->json('data');

        $this->assertEquals('paid', $txPaidData['payment_state']);
        $this->assertEquals(2400.00, $txPaidData['money']['gross_collected']);
        $this->assertEquals(0.00, $txPaidData['money']['balance']);
        // Verify payment methods contains only Cash (not fallback placeholder Bank Transfer)
        $this->assertEquals(['Cash'], $txPaidData['money']['payment_methods']);

        // 6. Verify Driver Portal / Trips Access
        $driverResponse = $this->actingAs($this->driver)->getJson('/api/v1/trip-tickets');
        $driverResponse->assertOk();
        $driverTickets = $driverResponse->json('data') ?? $driverResponse->json();
        $this->assertNotEmpty($driverTickets, 'Driver Eduardo must be able to view the assigned trip ticket.');
        $assignedTicket = collect($driverTickets)->firstWhere('driver_id', $this->driver->id);
        $this->assertNotNull($assignedTicket);
        $this->assertEquals('APA 4526', $assignedTicket['plate_no'] ?? $assignedTicket['bus']['plate_number'] ?? null);
        $this->assertEquals('Browser QA Educational Tour 082526-01', $assignedTicket['tour_name']);
        $this->assertEquals('JVD-EDT-BROWSER--2026-003', $assignedTicket['tour_code']);

        // 7. Verify Accounting Reports
        $reportSummary = $this->actingAs($this->admin)->getJson('/api/v1/accounting/reports/summary?range=all');
        $reportSummary->assertOk();
        $summaryData = $reportSummary->json('data');
        $this->assertEquals(2400.00, (float) $summaryData['kpis']['revenue']);
        $this->assertEquals(1, $summaryData['kpis']['transactions']);

        $reportDetailed = $this->actingAs($this->admin)->getJson('/api/v1/accounting/reports/detailed?range=all');
        $reportDetailed->assertOk();
        $detailedData = $reportDetailed->json('data');
        $this->assertCount(1, $detailedData);
        $this->assertEquals(2400.00, (float) $detailedData[0]['total_amount']);
    }
}
