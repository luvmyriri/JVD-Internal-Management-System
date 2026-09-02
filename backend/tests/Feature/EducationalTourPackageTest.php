<?php

namespace Tests\Feature;

use App\Jobs\SendInvoiceDocumentsJob;
use App\Mail\TransactionNotificationMail;
use App\Models\Bus;
use App\Models\Collection;
use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\EducationalTourProgram;
use App\Models\Invoice;
use App\Models\User;
use App\Services\EducationalTourPackageService;
use App\Services\GeneralServiceAgreementPdfService;
use App\Services\InvoiceDocumentMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus as BusFacade;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EducationalTourPackageTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $driverOne;

    private User $driverTwo;

    private Bus $busOne;

    private Bus $busTwo;

    private EducationalTourProgram $program;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->superAdmin()->create();
        $this->driverOne = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $this->driverTwo = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $this->busOne = Bus::create(['plate_number' => 'PKG-BUS-01', 'model' => '49-seater Coach', 'vehicle_type' => 'bus', 'seating_capacity' => 49, 'status' => 'available']);
        $this->busTwo = Bus::create(['plate_number' => 'PKG-BUS-02', 'model' => '49-seater Coach', 'vehicle_type' => 'bus', 'seating_capacity' => 49, 'status' => 'available']);
        $this->program = EducationalTourProgram::create([
            'name' => 'Science Discovery Exposure Program',
            'default_stops' => ['Science Museum', 'Mind Center'],
            'minimum_students' => 20,
            'students_per_chaperone' => 20,
            'students_per_free_chaperone' => 20,
            'student_price' => 3450,
            'additional_chaperone_price' => 1200,
            'includes_meals' => true,
            'includes_coordinator' => true,
            'includes_insurance' => true,
            'includes_shirt' => false,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_creating_a_package_does_not_create_a_sale_or_invoice(): void
    {
        $invoiceCount = Invoice::count();
        $startsAt = now()->addMonth()->setTime(5, 0);

        $response = $this->actingAs($this->user)->postJson('/api/v1/sales/educational-tour-packages', [
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-AHS-SCI-2026-01',
            'name' => 'AHS Science Discovery Educational Tour',
            'school_name' => 'Ateneo Hills School',
            'grade_level' => 'Grade 10',
            'starts_at' => $startsAt->toIso8601String(),
            'ends_at' => $startsAt->copy()->addHours(15)->toIso8601String(),
            'pickup_location' => 'Ateneo Hills School Main Gate',
            'maximum_capacity' => 150,
            'rate_per_head' => 3450,
            'images' => ['data:image/png;base64,cGFja2FnZQ=='],
            'payment_policy' => 'flexible',
            'down_payment_amount' => 1000,
            'installment_count' => 3,
            'status' => 'published',
        ]);

        $response->assertCreated();
        $this->assertSame($invoiceCount, Invoice::count());
        $this->assertDatabaseHas('educational_tour_packages', [
            'tour_code' => 'JVD-AHS-SCI-2026-01',
            'maximum_capacity' => 150,
            'rate_per_head' => 3450,
            'is_tax_inclusive' => false,
            'vat_rate' => 0,
            'status' => 'published',
        ]);

        $this->assertSame(['data:image/png;base64,cGFja2FnZQ=='], $response->json('data.images'));

        $this->assertArrayNotHasKey('registration_token', $response->json('data'));
        $this->assertArrayNotHasKey('registration_url', $response->json('data'));
    }

    public function test_public_registration_routes_are_not_available(): void
    {
        $this->getJson('/api/v1/public/educational-tours/JVD-AHS-PUBLIC-01?t=unused')->assertNotFound();
        $this->postJson('/api/v1/public/educational-tours/JVD-AHS-PUBLIC-01/bookings?t=unused', [
            'participant' => ['first_name' => 'Public', 'last_name' => 'Visitor'],
        ])->assertNotFound();
        $this->getJson('/api/v1/public/educational-tour-bookings/EDT-OLD-001/statement?t=unused')->assertNotFound();
    }

    public function test_package_image_is_stored_on_the_public_disk_and_returns_a_public_url(): void
    {
        Storage::fake('public');

        $result = app(EducationalTourPackageService::class)->createPackage([
            'tour_code' => 'JVD-IMG-01',
            'name' => 'Package Image Tour',
            'school_name' => 'Image Test School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(8)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 40,
            'rate_per_head' => 2500,
            'status' => 'published',
        ], $this->user->id);

        /** @var EducationalTourPackage $package */
        $package = $result['package'];
        $response = $this->actingAs($this->user)->post(
            "/api/v1/sales/educational-tour-packages/{$package->id}/image",
            ['image' => UploadedFile::fake()->image('tour.png', 1200, 800)]
        );

        $response->assertCreated();
        $imageUrl = $response->json('image_url');
        $this->assertStringStartsWith('/storage/educational-tour-images/', $imageUrl);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $imageUrl));
        $this->assertSame([$imageUrl], $package->fresh()->images);
    }

    public function test_registering_participants_produces_unique_invoices_at_rate_per_head(): void
    {
        $this->withoutExceptionHandling();
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-AHS-INDIV-01',
            'name' => 'AHS Science Tour',
            'school_name' => 'Ateneo Hills School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 150,
            'rate_per_head' => 3450,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        $regResponse1 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'student_number' => 'AHS-2026-1042',
                'grade_level' => 'Grade 10',
                'section' => 'Einstein',
                'email' => 'maria.santos@example.com',
            ],
            'guardian' => [
                'name' => 'Ana Santos',
                'email' => 'ana.santos@example.com',
                'phone' => '09181234567',
            ],
            'payment_plan' => 'installment',
        ]);

        $regResponse1->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.billing.total', 3450)
            ->assertJsonPath('data.participant.display_name', 'Maria Santos');

        $bookingRef1 = $regResponse1->json('data.booking_reference');
        $invoiceId1 = $regResponse1->json('data.billing.invoice_id');

        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'reference' => $bookingRef1,
            'student_number' => 'AHS-2026-1042',
            'amount_due' => 3450,
        ]);
        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId1,
            'subtotal' => 3450,
            'tax_amount' => 0,
            'total_amount' => 3450,
            'balance' => 3450,
        ]);

        // Register second participant
        $regResponse2 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'student_number' => 'AHS-2026-1043',
                'grade_level' => 'Grade 10',
                'section' => 'Newton',
            ],
            'payment_plan' => 'full',
        ]);

        $regResponse2->assertCreated();
        $invoiceId2 = $regResponse2->json('data.billing.invoice_id');

        $this->assertNotEquals($invoiceId1, $invoiceId2);
        $this->assertDatabaseCount('educational_tour_participant_bookings', 2);
    }

    public function test_participant_invoice_email_is_deferred_until_after_the_http_response(): void
    {
        BusFacade::fake([SendInvoiceDocumentsJob::class]);

        $result = app(EducationalTourPackageService::class)->createPackage([
            'tour_code' => 'JVD-DEFER-MAIL-01',
            'name' => 'Deferred Mail Tour',
            'school_name' => 'Deferred Mail School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 50,
            'rate_per_head' => 3450,
            'status' => 'published',
        ], $this->user->id);

        $this->actingAs($this->user)
            ->postJson("/api/v1/sales/educational-tour-packages/{$result['package']->id}/participant-bookings", [
                'participant' => [
                    'first_name' => 'Deferred',
                    'last_name' => 'Student',
                    'email' => 'student@example.test',
                ],
            ])
            ->assertCreated();

        BusFacade::assertDispatchedAfterResponse(SendInvoiceDocumentsJob::class);
    }

    public function test_customer_document_mail_includes_invoice_soa_and_general_service_terms(): void
    {
        $result = app(EducationalTourPackageService::class)->createPackage([
            'tour_code' => 'JVD-DOCS-01',
            'name' => 'Customer Documents Tour',
            'school_name' => 'Documents School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 50,
            'rate_per_head' => 3450,
            'status' => 'published',
        ], $this->user->id);

        $response = $this->actingAs($this->user)->postJson(
            "/api/v1/sales/educational-tour-packages/{$result['package']->id}/participant-bookings",
            ['participant' => ['first_name' => 'Document', 'last_name' => 'Student', 'email' => 'docs@example.test']],
        )->assertCreated();

        $invoice = Invoice::findOrFail($response->json('data.billing.invoice_id'));
        $attachmentNames = collect((new TransactionNotificationMail($invoice))->attachments())->pluck('as');

        $this->assertContains("Invoice_{$invoice->invoice_number}.pdf", $attachmentNames);
        $this->assertContains("SOA_Collection_Form_{$invoice->invoice_number}.pdf", $attachmentNames);
        $this->assertContains("Service_Agreement_and_Terms_{$invoice->invoice_number}.pdf", $attachmentNames);

        $agreement = app(GeneralServiceAgreementPdfService::class)->generate($invoice)->output();
        $this->assertStringStartsWith('%PDF', $agreement);

        $invoice->load(Invoice::operationalDocumentRelations());
        $invoiceHtml = view('pdf.invoice', ['invoice' => $invoice, 'taxRate' => 0])->render();
        $soaHtml = view('pdf.statement_of_account', ['invoice' => $invoice, 'taxRate' => 0])->render();
        $this->assertStringContainsString('Educational Tour Participant Booking', $invoiceHtml);
        $this->assertStringContainsString('Participant Billing Details', $soaHtml);
        $this->assertStringNotContainsString('VAT', $invoiceHtml);
        $this->assertStringNotContainsString('VAT', $soaHtml);
    }

    public function test_capacity_exceeded_returns_409_package_full(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-CAP-01',
            'name' => 'Small Capacity Tour',
            'school_name' => 'Small School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 2,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        // Register 1st
        $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'One', 'student_number' => 'S1'],
        ])->assertCreated();

        // Register 2nd
        $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'Two', 'student_number' => 'S2'],
        ])->assertCreated();

        // 3rd should fail with 409
        $response3 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'Three', 'student_number' => 'S3'],
        ]);

        $response3->assertStatus(409);
        $this->assertDatabaseCount('educational_tour_participant_bookings', 2);
    }

    public function test_downpayment_and_full_payment_synchronize_with_collections_and_confirm_booking(): void
    {
        $this->withoutExceptionHandling();
        BusFacade::fake([SendInvoiceDocumentsJob::class]);
        Mail::fake();
        Storage::fake('local');
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-PAY-01',
            'name' => 'Payment Test Tour',
            'school_name' => 'Payment School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'Campus',
            'maximum_capacity' => 50,
            'rate_per_head' => 3450,
            'down_payment_amount' => 1000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        $regResponse = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Maria', 'last_name' => 'Santos', 'student_number' => 'STU-001', 'email' => 'maria@example.test'],
        ])->assertCreated();

        $bookingRef = $regResponse->json('data.booking_reference');
        $booking = EducationalTourParticipantBooking::where('reference', $bookingRef)->firstOrFail();

        // Legacy/incomplete checkouts may be missing their generated collection.
        // Payment must reconstruct it using the real collections schema.
        Collection::where('invoice_id', $booking->invoice_id)->delete();

        // 1. Post Down Payment of 1000
        $pay1 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/payments", [
            'payment_kind' => 'down_payment',
            'payment_method' => 'Cash',
            'amount' => 1000,
            'idempotency_key' => 'or-001',
        ]);

        $pay1->assertCreated()
            ->assertJsonPath('data.status', 'posted')
            ->assertJsonPath('data.billing.paid', 1000)
            ->assertJsonPath('data.billing.balance', 2450)
            ->assertJsonPath('data.booking_status', 'partially_paid');

        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'id' => $booking->id,
            'status' => 'partially_paid',
            'payment_status' => 'partial',
        ]);
        $this->assertDatabaseHas('collection_payments', [
            'amount' => 1000,
            'idempotency_key' => 'or-001',
        ]);
        $this->assertDatabaseHas('collections', [
            'invoice_id' => $booking->invoice_id,
            'client_name' => $booking->full_name,
            'paid_amount' => 1000,
            'remaining_balance' => 2450,
        ]);

        // A browser or network retry must return the original payment without
        // posting a second collection receipt.
        $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/payments", [
            'payment_kind' => 'down_payment',
            'payment_method' => 'Cash',
            'amount' => 1000,
            'idempotency_key' => 'or-001',
        ])->assertOk()
            ->assertJsonPath('data.billing.paid', 1000)
            ->assertJsonPath('data.billing.balance', 2450);

        $this->assertSame(1, $booking->fresh()->payments()->count());

        // 2. Post Balance Payment of 2450
        $pay2 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/payments", [
            'payment_kind' => 'balance',
            'payment_method' => 'Bank Transfer',
            'amount' => 2450,
            'idempotency_key' => 'or-002',
        ]);

        $pay2->assertCreated()
            ->assertJsonPath('data.status', 'posted')
            ->assertJsonPath('data.billing.paid', 3450)
            ->assertJsonPath('data.billing.balance', 0)
            ->assertJsonPath('data.booking_status', 'confirmed');

        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'id' => $booking->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        $invoiceDocument = $this->actingAs($this->user)
            ->get("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/invoice")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertDownload("Invoice_{$booking->invoice->invoice_number}.pdf");
        $this->assertStringStartsWith('%PDF', $invoiceDocument->getContent());

        $statementDocument = $this->actingAs($this->user)
            ->get("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/statement")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertDownload("SOA_{$booking->invoice->invoice_number}.pdf");
        $this->assertStringStartsWith('%PDF', $statementDocument->getContent());
        $this->assertCount(
            2,
            Storage::disk('local')->allFiles("invoice-documents/{$booking->invoice_id}"),
            'Invoice and statement PDFs should be cached for later downloads and email delivery.',
        );

        $this->actingAs($this->user)
            ->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/send-documents")
            ->assertAccepted()
            ->assertJsonPath('data.invoice_id', $booking->invoice_id)
            ->assertJsonPath('data.recipient', 'maria@example.test')
            ->assertJsonPath('data.delivery_status', 'queued');

        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'id' => $booking->id,
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => 'maria@example.test',
        ]);

        Mail::assertNothingSent();
        BusFacade::assertDispatchedAfterResponse(
            SendInvoiceDocumentsJob::class,
            fn (SendInvoiceDocumentsJob $job) => $job->invoiceId === $booking->invoice_id
                && $job->recipient === 'maria@example.test'
                && $job->queue === 'mail'
        );
        BusFacade::assertDispatchedTimes(SendInvoiceDocumentsJob::class, 4);

        $job = new SendInvoiceDocumentsJob($booking->invoice_id, recipient: 'maria@example.test');
        $job->handle(app(InvoiceDocumentMailService::class));
        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'id' => $booking->id,
            'document_delivery_status' => 'sent',
            'document_delivery_recipient' => 'maria@example.test',
        ]);

        $job->failed(new \RuntimeException('SMTP unavailable'));
        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'id' => $booking->id,
            'document_delivery_status' => 'failed',
        ]);
    }

    public function test_fill_first_bus_allocation_strategy(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-BUS-ALLOC-01',
            'name' => 'Bus Allocation Tour',
            'school_name' => 'Alloc School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'Gate',
            'maximum_capacity' => 100,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        // Assign Bus 1 (Capacity 2 for this test) and Bus 2 (Capacity 2)
        $busAssignment1 = EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
            'sequence_number' => 1,
            'capacity_snapshot' => 2,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);

        $busAssignment2 = EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busTwo->id,
            'driver_id' => $this->driverTwo->id,
            'sequence_number' => 2,
            'capacity_snapshot' => 2,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);

        // Register 1st student -> should get Bus 1, Seat 1
        $r1 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'A'],
        ])->assertCreated();

        $this->assertSame(1, $r1->json('data.allocation.bus_number'));
        $this->assertSame('Seat 1', $r1->json('data.allocation.seat_number'));

        // Register 2nd student -> should get Bus 1, Seat 2
        $r2 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'B'],
        ])->assertCreated();

        $this->assertSame(1, $r2->json('data.allocation.bus_number'));
        $this->assertSame('Seat 2', $r2->json('data.allocation.seat_number'));

        // Register 3rd student -> Bus 1 is full, should get Bus 2, Seat 1
        $r3 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'C'],
        ])->assertCreated();

        $this->assertSame(2, $r3->json('data.allocation.bus_number'));
        $this->assertSame('Seat 1', $r3->json('data.allocation.seat_number'));
    }

    public function test_batch_allocation_includes_pending_desk_bookings_created_before_bus_assignment(): void
    {
        $result = app(EducationalTourPackageService::class)->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-LATE-BUS-01',
            'name' => 'Late Bus Assignment Tour',
            'school_name' => 'Desk Booking School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 10,
            'rate_per_head' => 2875,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        $bookingResponse = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Pending',
                'last_name' => 'Participant',
                'student_number' => 'LATE-BUS-001',
            ],
            'payment_plan' => 'down_payment',
        ])->assertCreated();

        $booking = EducationalTourParticipantBooking::where('reference', $bookingResponse->json('data.booking_reference'))->firstOrFail();
        $this->assertNull($booking->bus_assignment_id);

        EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busOne->id,
            'sequence_number' => 1,
            'capacity_snapshot' => 49,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/allocate-buses", [
                'strategy' => 'fill_current_bus_first',
            ])
            ->assertOk()
            ->assertJsonPath('data.allocated', 1);

        $booking->refresh();
        $this->assertNotNull($booking->bus_assignment_id);
        $this->assertSame('Seat 1', $booking->seat_number);
    }

    public function test_bus_allocation_keeps_tandang_sora_separate_from_fairview_and_main(): void
    {
        $result = app(EducationalTourPackageService::class)->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-BRANCH-BUS-01',
            'name' => 'Branch Safe Allocation Tour',
            'school_name' => 'Branch School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'Main, Fairview, and Tandang Sora',
            'maximum_capacity' => 20,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];
        $mainBus = EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
            'sequence_number' => 1,
            'capacity_snapshot' => 10,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);
        $tandangBus = EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busTwo->id,
            'driver_id' => $this->driverTwo->id,
            'sequence_number' => 2,
            'capacity_snapshot' => 10,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);

        $register = function (string $firstName, string $branch) use ($package): EducationalTourParticipantBooking {
            $response = $this->actingAs($this->user)->postJson(
                "/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings",
                ['participant' => ['first_name' => $firstName, 'last_name' => 'Passenger', 'section' => $branch]],
            )->assertCreated();

            return EducationalTourParticipantBooking::where('reference', $response->json('data.booking_reference'))->firstOrFail();
        };

        $main = $register('Main', 'Main Branch');
        $tandang = $register('Tandang', 'Tandang Sora Branch');
        $fairview = $register('Fairview', 'Fairview Branch');

        $this->assertSame($mainBus->id, $main->bus_assignment_id);
        $this->assertSame($tandangBus->id, $tandang->bus_assignment_id);
        $this->assertSame($mainBus->id, $fairview->bus_assignment_id);
    }

    public function test_existing_bus_assignment_can_change_driver_without_conflicting_with_its_own_trip_ticket(): void
    {
        $result = app(EducationalTourPackageService::class)->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-EDIT-BUS-01',
            'name' => 'Editable Bus Tour',
            'school_name' => 'Edit School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 49,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];
        $assignment = app(EducationalTourPackageService::class)->assignBus($package, [
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
        ], $this->user->id);

        $this->assertDatabaseHas('trip_tickets', [
            'educational_tour_package_id' => $package->id,
            'educational_tour_bus_assignment_id' => $assignment->id,
            'bus_id' => $this->busOne->id,
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/v1/sales/educational-tour-packages/{$package->id}/bus-assignments/{$assignment->id}", [
                'bus_id' => $this->busOne->id,
                'driver_id' => $this->driverTwo->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.driver_id', $this->driverTwo->id);

        $this->assertSame($this->driverTwo->id, $assignment->fresh()->driver_id);
    }

    public function test_package_edit_updates_bus_and_driver_without_creating_duplicate_assignments_or_trip_tickets(): void
    {
        $result = app(EducationalTourPackageService::class)->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-EDIT-FLEET-01',
            'name' => 'Fleet Edit Tour',
            'school_name' => 'Fleet Edit School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 49,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];
        $assignment = app(EducationalTourPackageService::class)->assignBus($package, [
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
        ], $this->user->id);

        $this->actingAs($this->user)
            ->putJson("/api/v1/sales/educational-tour-packages/{$package->id}", [
                'bus_assignments' => [[
                    'id' => $assignment->id,
                    'bus_id' => $this->busTwo->id,
                    'driver_id' => $this->driverTwo->id,
                    'sequence_number' => 1,
                ]],
            ])
            ->assertOk();

        $this->assertSame(1, EducationalTourBusAssignment::where('package_id', $package->id)->count());
        $this->assertDatabaseHas('educational_tour_bus_assignments', [
            'id' => $assignment->id,
            'package_id' => $package->id,
            'bus_id' => $this->busTwo->id,
            'driver_id' => $this->driverTwo->id,
            'sequence_number' => 1,
        ]);
        $this->assertDatabaseCount('trip_tickets', 1);
        $this->assertDatabaseHas('trip_tickets', [
            'educational_tour_package_id' => $package->id,
            'educational_tour_bus_assignment_id' => $assignment->id,
            'bus_id' => $this->busTwo->id,
            'driver_id' => $this->driverTwo->id,
        ]);
    }

    public function test_cancellation_releases_seat_without_altering_other_participants(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-CANCEL-01',
            'name' => 'Cancel Test Tour',
            'school_name' => 'Cancel School',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(12)->toIso8601String(),
            'pickup_location' => 'Gate',
            'maximum_capacity' => 10,
            'rate_per_head' => 3000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        $busAssignment = EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $this->busOne->id,
            'sequence_number' => 1,
            'capacity_snapshot' => 10,
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);

        $r1 = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Student', 'last_name' => 'One'],
        ])->assertCreated();

        $booking = EducationalTourParticipantBooking::where('reference', $r1->json('data.booking_reference'))->firstOrFail();
        $this->assertSame($busAssignment->id, $booking->bus_assignment_id);

        $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/cancel", [
            'reason' => 'Student sick',
        ])->assertOk();

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertNull($booking->bus_assignment_id);
        $this->assertNull($booking->seat_number);
    }

    public function test_separate_rates_for_student_and_adult_passengers(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-RATES-01',
            'name' => 'Dual Rate Tour',
            'school_name' => 'Dual Rate Academy',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(10)->toIso8601String(),
            'pickup_location' => 'Main Gate',
            'maximum_capacity' => 50,
            'rate_per_head' => 2500,
            'adult_rate_per_head' => 1200,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];
        $this->assertEquals(1200.00, (float) $package->adult_rate_per_head);

        // 1. Register a student
        $studentRes = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Ana',
                'last_name' => 'Santos',
                'type' => 'student',
                'student_number' => 'STU-1001',
                'section' => 'St. Peter',
            ],
            'participant_type' => 'student',
        ])->assertCreated();

        $this->assertEquals(2500.00, (float) $studentRes->json('data.billing.total'));

        // 2. Register an adult / companion
        $adultRes = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'type' => 'adult',
            ],
            'participant_type' => 'adult',
        ])->assertCreated();

        $this->assertEquals(1200.00, (float) $adultRes->json('data.billing.total'));

        // 3. Verify package details metrics have student and adult breakdown
        $detailsRes = $this->actingAs($this->user)->getJson("/api/v1/sales/educational-tour-packages/{$package->id}")->assertOk();
        $this->assertSame(1, $detailsRes->json('data.capacity.students_count'));
        $this->assertSame(1, $detailsRes->json('data.capacity.adults_count'));
        $this->assertEquals(1200.00, (float) $detailsRes->json('data.pricing.adult_rate_per_head'));
    }

    public function test_delete_educational_tour_package_endpoint(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-DEL-01',
            'name' => 'Package To Delete',
            'school_name' => 'Delete High',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(10)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 40,
            'rate_per_head' => 1500,
            'status' => 'draft',
        ], $this->user->id);

        $package = $result['package'];

        $deleteRes = $this->actingAs($this->user)->deleteJson("/api/v1/sales/educational-tour-packages/{$package->id}");
        $deleteRes->assertOk();
        $deleteRes->assertJson(['message' => 'Educational tour package deleted successfully.']);

        $this->assertDatabaseMissing('educational_tour_packages', [
            'id' => $package->id,
        ]);
    }

    public function test_delete_educational_tour_package_with_bookings_and_buses(): void
    {
        $packageService = app(EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'program_id' => $this->program->id,
            'tour_code' => 'JVD-DEL-02',
            'name' => 'Package With Bookings To Delete',
            'school_name' => 'Delete High 2',
            'starts_at' => now()->addMonth()->toIso8601String(),
            'ends_at' => now()->addMonth()->addHours(10)->toIso8601String(),
            'pickup_location' => 'School Gate',
            'maximum_capacity' => 50,
            'rate_per_head' => 2000,
            'status' => 'published',
        ], $this->user->id);

        $package = $result['package'];

        // Assign a bus
        $packageService->assignBus($package, [
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
        ], $this->user->id);

        // Register participant
        $regRes = $this->actingAs($this->user)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'type' => 'student',
            ],
            'participant_type' => 'student',
        ])->assertCreated();

        $this->assertDatabaseHas('educational_tour_packages', ['id' => $package->id]);
        $this->assertDatabaseHas('educational_tour_participant_bookings', ['package_id' => $package->id]);

        $deleteRes = $this->actingAs($this->user)->deleteJson("/api/v1/sales/educational-tour-packages/{$package->id}");
        $deleteRes->assertOk();

        $this->assertDatabaseMissing('educational_tour_packages', ['id' => $package->id]);
        $this->assertDatabaseMissing('educational_tour_participant_bookings', ['package_id' => $package->id]);
        $this->assertDatabaseMissing('educational_tour_bus_assignments', ['package_id' => $package->id]);
    }
}
