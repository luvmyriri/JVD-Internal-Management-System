<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\EducationalTourProgram;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class EducationalTourLiveQATest extends TestCase
{
    use RefreshDatabase;

    private User $salesStaff;

    private User $driver1;

    private User $driver2;

    private Bus $bus1;

    private Bus $bus2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salesStaff = User::factory()->superAdmin()->create();

        $this->driver1 = User::factory()->create([
            'role' => 'driver',
            'first_name' => 'QA Driver',
            'last_name' => 'One',
            'is_active' => true,
        ]);

        $this->driver2 = User::factory()->create([
            'role' => 'driver',
            'first_name' => 'QA Driver',
            'last_name' => 'Two',
            'is_active' => true,
        ]);

        $this->bus1 = Bus::factory()->create([
            'plate_number' => 'QA-BUS-01',
            'model' => 'Golden Dragon 49-Seater',
            'seating_capacity' => 49,
            'status' => 'available',
        ]);

        $this->bus2 = Bus::factory()->create([
            'plate_number' => 'QA-BUS-02',
            'model' => 'Higer Luxury 49-Seater',
            'seating_capacity' => 49,
            'status' => 'available',
        ]);
    }

    /**
     * 1. Manual seat selection during individual desk registration.
     */
    public function test_manual_seat_selection_during_individual_registration(): void
    {
        $this->withoutExceptionHandling();
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        $response = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'student_number' => 'QA-STU-001',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 15',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('Seat 15', $response->json('data.allocation.seat_number'));
        $this->assertEquals($busAssign->id, $response->json('data.allocation.bus_assignment_id'));

        $booking = EducationalTourParticipantBooking::where('student_number', 'QA-STU-001')->firstOrFail();
        $this->assertEquals($busAssign->id, $booking->bus_assignment_id);
        $this->assertEquals('Seat 15', $booking->seat_number);
    }

    /**
     * 2. Selected seat belongs to another package (rejected with validation error).
     */
    public function test_selected_seat_belongs_to_another_package_is_rejected(): void
    {
        $packageA = $this->createTestPackage('Package A');
        $packageB = $this->createTestPackage('Package B');

        $busAssignA = $this->createBusAssignment($packageA, $this->bus1, $this->driver1, 1, 49);

        // Attempt to register on package B using package A's bus assignment ID
        $response = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$packageB->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Foreign',
                'last_name' => 'Student',
                'student_number' => 'QA-STU-FOREIGN',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssignA->id,
            'seat_number' => 'Seat 10',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('bus_assignment_id');
        $this->assertDatabaseMissing('educational_tour_participant_bookings', ['student_number' => 'QA-STU-FOREIGN']);
    }

    /**
     * 3. Seat number exceeds bus capacity (rejected with validation error).
     */
    public function test_seat_number_exceeds_bus_capacity_is_rejected(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        $response = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Overcapacity',
                'last_name' => 'Student',
                'student_number' => 'QA-STU-OVERCAP',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 50', // Exceeds 49
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('seat_number');
        $this->assertDatabaseMissing('educational_tour_participant_bookings', ['student_number' => 'QA-STU-OVERCAP']);
    }

    /**
     * 4. Duplicate occupied seat is rejected.
     */
    public function test_duplicate_occupied_seat_is_rejected(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        // 1st participant gets Seat 7
        $r1 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'First',
                'last_name' => 'Person',
                'student_number' => 'QA-STU-007',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 7',
        ]);
        $r1->assertStatus(201);

        // 2nd participant tries to claim Seat 7
        $r2 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Second',
                'last_name' => 'Person',
                'student_number' => 'QA-STU-DUP',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 7',
        ]);

        $r2->assertStatus(422);
        $r2->assertJsonValidationErrors('seat_number');
        $this->assertDatabaseMissing('educational_tour_participant_bookings', ['student_number' => 'QA-STU-DUP']);
    }

    /**
     * 5. Automatic seat assignment.
     */
    public function test_automatic_seat_assignment(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        $response = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Auto',
                'last_name' => 'Participant',
                'student_number' => 'QA-STU-AUTO',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'automatic',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('Seat 1', $response->json('data.allocation.seat_number'));
        $this->assertEquals($busAssign->id, $response->json('data.allocation.bus_assignment_id'));
    }

    /**
     * 6. Multiple buses fill correctly sequentially.
     */
    public function test_multiple_buses_fill_correctly(): void
    {
        $package = $this->createTestPackage();
        $busAssign1 = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 2);
        $busAssign2 = $this->createBusAssignment($package, $this->bus2, $this->driver2, 2, 2);

        // Student 1 -> Bus 1 Seat 1
        $r1 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'S1', 'last_name' => 'Multi', 'student_number' => 'S-01'],
            'allocation_mode' => 'automatic',
        ])->assertStatus(201);
        $this->assertEquals($busAssign1->id, $r1->json('data.allocation.bus_assignment_id'));
        $this->assertEquals('Seat 1', $r1->json('data.allocation.seat_number'));

        // Student 2 -> Bus 1 Seat 2 (Bus 1 now full)
        $r2 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'S2', 'last_name' => 'Multi', 'student_number' => 'S-02'],
            'allocation_mode' => 'automatic',
        ])->assertStatus(201);
        $this->assertEquals($busAssign1->id, $r2->json('data.allocation.bus_assignment_id'));
        $this->assertEquals('Seat 2', $r2->json('data.allocation.seat_number'));

        // Student 3 -> Bus 2 Seat 1
        $r3 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'S3', 'last_name' => 'Multi', 'student_number' => 'S-03'],
            'allocation_mode' => 'automatic',
        ])->assertStatus(201);
        $this->assertEquals($busAssign2->id, $r3->json('data.allocation.bus_assignment_id'));
        $this->assertEquals('Seat 1', $r3->json('data.allocation.seat_number'));
    }

    /**
     * 7. Cancellation releases the seat.
     * 8. Released seat can be assigned again.
     */
    public function test_cancellation_releases_seat_and_released_seat_can_be_assigned_again(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        // Register Student A with Seat 20
        $r1 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'StudentA', 'last_name' => 'Cancel', 'student_number' => 'STU-A'],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 20',
        ])->assertStatus(201);

        $bookingA = EducationalTourParticipantBooking::where('student_number', 'STU-A')->firstOrFail();
        $this->assertEquals('Seat 20', $bookingA->seat_number);

        // Cancel Student A
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$bookingA->id}/cancel", [
            'reason' => 'Schedule conflict',
        ])->assertStatus(200);

        $bookingA->refresh();
        $this->assertEquals('cancelled', $bookingA->status);
        $this->assertNull($bookingA->bus_assignment_id);
        $this->assertNull($bookingA->seat_number);

        // Student B now registers and claims Seat 20 (must succeed)
        $r2 = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'StudentB', 'last_name' => 'Reuse', 'student_number' => 'STU-B'],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 20',
        ]);

        $r2->assertStatus(201);
        $this->assertEquals('Seat 20', $r2->json('data.allocation.seat_number'));
        $bookingB = EducationalTourParticipantBooking::where('student_number', 'STU-B')->firstOrFail();
        $this->assertEquals('Seat 20', $bookingB->seat_number);
    }

    /**
     * 9. Payment does not alter the selected seat.
     */
    public function test_payment_does_not_alter_the_selected_seat(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        // Register Student with Seat 12
        $reg = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Payer', 'last_name' => 'Student', 'student_number' => 'STU-PAY-12'],
            'payment_plan' => 'down_payment',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 12',
        ])->assertStatus(201);

        $booking = EducationalTourParticipantBooking::where('student_number', 'STU-PAY-12')->firstOrFail();
        $this->assertEquals('Seat 12', $booking->seat_number);

        // Post Down Payment
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/payments", [
            'payment_kind' => 'down_payment',
            'payment_method' => 'Cash',
            'amount' => 1000.00,
            'idempotency_key' => 'live-qa-pay-01',
        ])->assertStatus(201);

        $booking->refresh();
        $this->assertEquals('partially_paid', $booking->status);
        $this->assertEquals('Seat 12', $booking->seat_number);
        $this->assertEquals($busAssign->id, $booking->bus_assignment_id);

        // Post Full Balance Payment
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$booking->id}/payments", [
            'payment_kind' => 'balance',
            'payment_method' => 'Bank Transfer',
            'amount' => 2500.00,
            'idempotency_key' => 'live-qa-pay-02',
        ])->assertStatus(201);

        $booking->refresh();
        $this->assertEquals('confirmed', $booking->status);
        $this->assertEquals('Seat 12', $booking->seat_number);
        $this->assertEquals($busAssign->id, $booking->bus_assignment_id);
    }

    /**
     * 10. Registration failure does not create an invoice or booking.
     */
    public function test_registration_failure_does_not_create_invoice_or_booking(): void
    {
        $package = $this->createTestPackage();
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);

        // Book Seat 5 first
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Original', 'last_name' => 'Student', 'student_number' => 'STU-ORIG-5'],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 5',
        ])->assertStatus(201);

        $initialInvoiceCount = Invoice::count();
        $initialBookingCount = EducationalTourParticipantBooking::count();

        // Attempt duplicate seat 5
        $failedResponse = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => ['first_name' => 'Failing', 'last_name' => 'Student', 'student_number' => 'STU-FAIL-5'],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign->id,
            'seat_number' => 'Seat 5',
        ]);

        $failedResponse->assertStatus(422);
        $this->assertEquals($initialInvoiceCount, Invoice::count());
        $this->assertEquals($initialBookingCount, EducationalTourParticipantBooking::count());
    }

    /**
     * Complete Comprehensive Live QA Workflow Test.
     */
    public function test_complete_live_qa_workflow_multi_bus_seats_cancellation_payment_manifest(): void
    {
        // 1. Open an existing Educational Tour with at least 2 buses assigned
        $package = $this->createTestPackage('QA Comprehensive Live Tour');
        $busAssign1 = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);
        $busAssign2 = $this->createBusAssignment($package, $this->bus2, $this->driver2, 2, 49);

        // 2. Add Participant A and manually select Bus 1, Seat 1
        $resA = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Participant',
                'last_name' => 'Alpha',
                'student_number' => 'QA-STU-ALPHA',
                'grade_level' => 'Grade 11',
            ],
            'payment_plan' => 'down_payment',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign1->id,
            'seat_number' => 'Seat 1',
        ]);
        $resA->assertStatus(201);

        // 3. Confirm roster displays that exact seat
        $roster = $this->actingAs($this->salesStaff)->getJson("/api/v1/sales/educational-tour-participant-bookings?package_id={$package->id}");
        $roster->assertStatus(200);
        $pAlpha = collect($roster->json('data'))->firstWhere('student_number', 'QA-STU-ALPHA');
        $this->assertEquals('Seat 1', $pAlpha['seat_number']);
        $this->assertEquals($busAssign1->id, $pAlpha['bus_assignment_id']);

        // 4. Try assigning Participant B to the same seat (Bus 1, Seat 1) and confirm rejection
        $resBDup = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Participant',
                'last_name' => 'Beta',
                'student_number' => 'QA-STU-BETA',
            ],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign1->id,
            'seat_number' => 'Seat 1',
        ]);
        $resBDup->assertStatus(422);

        // 5. Select another seat (Bus 2, Seat 10) and successfully create Participant B
        $resB = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Participant',
                'last_name' => 'Beta',
                'student_number' => 'QA-STU-BETA',
            ],
            'payment_plan' => 'full',
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign2->id,
            'seat_number' => 'Seat 10',
        ]);
        $resB->assertStatus(201);

        // 6. Add Participant C using automatic allocation
        $resC = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Participant',
                'last_name' => 'Charlie',
                'student_number' => 'QA-STU-CHARLIE',
            ],
            'allocation_mode' => 'automatic',
        ]);
        $resC->assertStatus(201);
        $this->assertEquals('Seat 2', $resC->json('data.allocation.seat_number'));
        $this->assertEquals($busAssign1->id, $resC->json('data.allocation.bus_assignment_id'));

        // 7. Record payment for Participant A
        $bookingA = EducationalTourParticipantBooking::where('student_number', 'QA-STU-ALPHA')->firstOrFail();
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$bookingA->id}/payments", [
            'payment_kind' => 'full',
            'payment_method' => 'Cash',
            'amount' => 3500.00,
            'idempotency_key' => 'live-qa-full-alpha',
        ])->assertStatus(201);

        // 8. Confirm Participant A retains the manually selected seat
        $bookingA->refresh();
        $this->assertEquals('confirmed', $bookingA->status);
        $this->assertEquals('Seat 1', $bookingA->seat_number);

        // 9. Move Participant B to another available seat (Bus 2, Seat 15)
        $bookingB = EducationalTourParticipantBooking::where('student_number', 'QA-STU-BETA')->firstOrFail();
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$bookingB->id}/move-seat", [
            'bus_assignment_id' => $busAssign2->id,
            'seat_number' => 'Seat 15',
        ])->assertStatus(200);

        $bookingB->refresh();
        $this->assertEquals('Seat 15', $bookingB->seat_number);

        // 10. Cancel Participant B
        $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-participant-bookings/{$bookingB->id}/cancel", [
            'reason' => 'QA cancellation test',
        ])->assertStatus(200);

        // 11. Confirm released seat (Seat 15 on Bus 2) becomes selectable again
        $resReclaim = $this->actingAs($this->salesStaff)->postJson("/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings", [
            'participant' => [
                'first_name' => 'Participant',
                'last_name' => 'Delta',
                'student_number' => 'QA-STU-DELTA',
            ],
            'allocation_mode' => 'manual',
            'bus_assignment_id' => $busAssign2->id,
            'seat_number' => 'Seat 15',
        ]);
        $resReclaim->assertStatus(201);
        $this->assertEquals('Seat 15', $resReclaim->json('data.allocation.seat_number'));

        // 12. Download the authenticated manifest and verify status 200 with pdf header
        $manifestResponse = $this->actingAs($this->salesStaff)->get("/api/v1/sales/educational-tour-packages/{$package->id}/manifest");
        $manifestResponse->assertStatus(200);
        $manifestResponse->assertHeader('content-type', 'application/pdf');
    }

    /**
     * 13. Bulk participant registration support (Excel import payload).
     */
    public function test_bulk_participant_registration_support(): void
    {
        $package = $this->createTestPackage('Bulk Import QA Tour');
        $busAssign1 = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1, 49);
        $busAssign2 = $this->createBusAssignment($package, $this->bus2, $this->driver2, 2, 49);

        $bulkPayload = [
            'participants' => [
                [
                    'participant' => [
                        'first_name' => 'John',
                        'last_name' => 'Imported1',
                        'student_number' => 'IMP-001',
                        'grade_level' => 'Grade 10',
                        'section' => 'Newton',
                    ],
                    'payment_plan' => 'full',
                    'allocation_mode' => 'manual',
                    'bus_sequence' => 1,
                    'seat_number' => 'Seat 1',
                ],
                [
                    'participant' => [
                        'first_name' => 'Jane',
                        'last_name' => 'Imported2',
                        'student_number' => 'IMP-002',
                        'grade_level' => 'Grade 10',
                        'section' => 'Newton',
                    ],
                    'payment_plan' => 'down_payment',
                    'allocation_mode' => 'manual',
                    'bus_sequence' => 1,
                    'seat_number' => 'Seat 2',
                ],
                [
                    'participant' => [
                        'first_name' => 'Jack',
                        'last_name' => 'Imported3',
                        'student_number' => 'IMP-003',
                        'grade_level' => 'Grade 10',
                        'section' => 'Einstein',
                    ],
                    'payment_plan' => 'installment',
                    'allocation_mode' => 'automatic',
                ],
            ],
        ];

        $response = $this->actingAs($this->salesStaff)->postJson(
            "/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings/bulk",
            $bulkPayload
        );

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('data.total'));
        $this->assertEquals(3, $response->json('data.created'));
        $this->assertEquals(0, $response->json('data.failed'));

        // Verify individual invoices and participant records were created
        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'package_id' => $package->id,
            'student_number' => 'IMP-001',
            'seat_number' => 'Seat 1',
            'bus_assignment_id' => $busAssign1->id,
        ]);
        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'package_id' => $package->id,
            'student_number' => 'IMP-002',
            'seat_number' => 'Seat 2',
            'bus_assignment_id' => $busAssign1->id,
        ]);
        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'package_id' => $package->id,
            'student_number' => 'IMP-003',
            'seat_number' => 'Seat 3',
            'bus_assignment_id' => $busAssign1->id,
        ]);
    }

    /**
     * 12. ET-QA-001: bus-availability endpoint returns HTTP 200 without undefined column errors.
     */
    public function test_bus_availability_endpoint_succeeds_without_error(): void
    {
        $package = $this->createTestPackage('Availability Check Tour');
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1);

        // Add a participant seated on Seat 4
        $this->actingAs($this->salesStaff, 'sanctum')->postJson(
            "/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings",
            [
                'participant' => [
                    'first_name' => 'Alpha',
                    'last_name' => 'BrowserQA',
                    'student_number' => 'BQA-001',
                ],
                'payment_plan' => 'full',
                'allocation_mode' => 'manual',
                'bus_assignment_id' => $busAssign->id,
                'seat_number' => 'Seat 4',
            ]
        )->assertCreated();

        $startsAt = $package->starts_at->toDateString();
        $endsAt = $package->ends_at->toDateString();

        $response = $this->actingAs($this->salesStaff, 'sanctum')->getJson(
            "/api/v1/sales/bus-availability?bus_id={$this->bus1->id}&starts_at={$startsAt}&ends_at={$endsAt}"
        );

        $response->assertOk()
            ->assertJsonPath('data.bus_id', $this->bus1->id)
            ->assertJsonPath('data.plate_number', $this->bus1->plate_number)
            ->assertJsonPath('data.is_whole_vehicle_booked', false);

        $occupiedSeats = $response->json('data.occupied_seats');
        $this->assertContains('4', $occupiedSeats);
    }

    /**
     * 13. ET-QA-002: Explicit seat selection preserves Seat 4 and rejects duplicate seat reservation.
     */
    public function test_explicit_seat_selection_preserves_seat_and_rejects_duplicate(): void
    {
        $package = $this->createTestPackage('Explicit Seat Tour');
        $busAssign = $this->createBusAssignment($package, $this->bus1, $this->driver1, 1);

        // Student 1 explicitly selects Seat 4
        $res1 = $this->actingAs($this->salesStaff, 'sanctum')->postJson(
            "/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings",
            [
                'participant' => [
                    'first_name' => 'Alpha',
                    'last_name' => 'BrowserQA',
                    'student_number' => 'BQA-001',
                ],
                'payment_plan' => 'down_payment',
                'allocation_mode' => 'manual',
                'bus_assignment_id' => $busAssign->id,
                'seat_number' => 'Seat 4',
            ]
        );

        $res1->assertCreated()
            ->assertJsonPath('data.seat_number', 'Seat 4')
            ->assertJsonPath('data.bus_assignment_id', $busAssign->id);

        $this->assertDatabaseHas('educational_tour_participant_bookings', [
            'package_id' => $package->id,
            'student_number' => 'BQA-001',
            'seat_number' => 'Seat 4',
            'bus_assignment_id' => $busAssign->id,
        ]);

        // Student 2 attempts to claim the same Seat 4 -> must be rejected with 422
        $res2 = $this->actingAs($this->salesStaff, 'sanctum')->postJson(
            "/api/v1/sales/educational-tour-packages/{$package->id}/participant-bookings",
            [
                'participant' => [
                    'first_name' => 'Beta',
                    'last_name' => 'BrowserQA',
                    'student_number' => 'BQA-002',
                ],
                'payment_plan' => 'full',
                'allocation_mode' => 'manual',
                'bus_assignment_id' => $busAssign->id,
                'seat_number' => 'Seat 4',
            ]
        );

        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['seat_number']);
    }

    /**
     * 14. ET-QA-005: Generated tour code avoids double hyphens for school names ending in hyphen-boundary slugs.
     */
    public function test_generated_tour_code_has_no_double_hyphens(): void
    {
        $packageService = app(\App\Services\EducationalTourPackageService::class);
        $result = $packageService->createPackage([
            'school_name' => 'Browser QA Academy',
            'name' => 'Browser QA Educational Tour',
            'starts_at' => '2026-09-02 08:00:00',
            'ends_at' => '2026-09-02 17:00:00',
            'pickup_location' => 'Main Gate',
            'rate_per_head' => 2400.00,
            'maximum_capacity' => 100,
        ], $this->salesStaff->id);

        $tourCode = $result['package']->tour_code;
        $this->assertStringNotContainsString('--', $tourCode);
        $this->assertMatchesRegularExpression('/^JVD-EDT-[A-Z0-9]+-2026-\d{3}$/', $tourCode);
    }

    private function createTestPackage(string $name = 'QA Educational Tour'): EducationalTourPackage
    {
        return EducationalTourPackage::create([
            'public_id' => Str::uuid()->toString(),
            'tour_code' => 'QA-EDT-' . Str::upper(Str::random(6)),
            'name' => $name,
            'school_name' => 'QA Heritage High',
            'grade_level' => 'Grade 11',
            'starts_at' => now()->addDays(7)->setTime(8, 0)->toDateTimeString(),
            'ends_at' => now()->addDays(7)->setTime(17, 0)->toDateTimeString(),
            'pickup_location' => 'QA Campus Gate',
            'maximum_capacity' => 100,
            'rate_per_head' => 3500.00,
            'payment_policy' => 'flexible',
            'down_payment_amount' => 1000.00,
            'status' => 'published',
            'registration_token_hash' => hash('sha256', Str::random(64)),
            'created_by' => $this->salesStaff->id,
        ]);
    }

    private function createBusAssignment(
        EducationalTourPackage $package,
        Bus $bus,
        User $driver,
        int $sequence,
        int $capacity = 49
    ): EducationalTourBusAssignment {
        return EducationalTourBusAssignment::create([
            'package_id' => $package->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'sequence_number' => $sequence,
            'capacity_snapshot' => $capacity,
            'status' => 'confirmed',
            'created_by' => $this->salesStaff->id,
        ]);
    }
}
