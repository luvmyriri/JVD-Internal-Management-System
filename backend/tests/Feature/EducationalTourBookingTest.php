<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Contract;
use App\Models\EducationalTourBooking;
use App\Models\EducationalTourProgram;
use App\Models\Service;
use App\Models\TripTicket;
use App\Models\User;
use App\Services\EducationalTourBookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EducationalTourBookingTest extends TestCase
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
        $this->busOne = Bus::create(['plate_number' => 'EDU-01', 'model' => 'School Coach', 'vehicle_type' => 'bus', 'seating_capacity' => 49, 'status' => 'available']);
        $this->busTwo = Bus::create(['plate_number' => 'EDU-02', 'model' => 'Coaster', 'vehicle_type' => 'coaster', 'seating_capacity' => 20, 'status' => 'available']);
        $this->program = EducationalTourProgram::create([
            'name' => 'Science Discovery Tour', 'default_stops' => ['Science Museum', 'Planetarium'],
            'minimum_students' => 20, 'students_per_chaperone' => 20, 'students_per_free_chaperone' => 20,
            'student_price' => 2000, 'additional_chaperone_price' => 1500, 'includes_meals' => true,
            'includes_coordinator' => true, 'includes_insurance' => true, 'includes_shirt' => false, 'created_by' => $this->user->id,
        ]);
    }

    public function test_program_is_created_directly_without_a_generic_catalog_service(): void
    {
        $serviceCount = Service::count();

        $response = $this->actingAs($this->user)->postJson('/api/v1/sales/educational-programs', [
            'name' => 'Heritage and Civic Learning Tour',
            'learning_objectives' => 'Connect local history with civic institutions.',
            'default_stops' => ['National Museum', 'City Hall'],
            'minimum_students' => 25,
            'students_per_chaperone' => 15,
            'students_per_free_chaperone' => 20,
            'student_price' => 1850,
            'additional_chaperone_price' => 1200,
            'includes_meals' => true,
            'includes_coordinator' => true,
            'includes_insurance' => true,
            'includes_shirt' => false,
            'images' => ['/storage/services/heritage-tour.jpg'],
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Heritage and Civic Learning Tour')
            ->assertJsonPath('data.default_stops.1', 'City Hall')
            ->assertJsonPath('data.students_per_chaperone', 15)
            ->assertJsonPath('data.student_price', 1850)
            ->assertJsonPath('data.images.0', '/storage/services/heritage-tour.jpg');

        $created = $response->json('data');
        $this->assertArrayNotHasKey('service_id', $created);
        $this->assertArrayNotHasKey('service', $created);
        $this->assertSame($serviceCount, Service::count());
        $this->assertDatabaseHas('educational_tour_programs', [
            'id' => $created['id'],
            'name' => 'Heritage and Civic Learning Tour',
            'service_id' => null,
            'minimum_students' => 25,
        ]);

        $programs = $this->actingAs($this->user)->getJson('/api/v1/sales/educational-programs')->assertOk()->json('data');
        $listed = collect($programs)->firstWhere('id', $created['id']);
        $this->assertSame(['National Museum', 'City Hall'], $listed['default_stops']);
        $this->assertSame(true, $listed['includes_coordinator']);
        $this->assertArrayNotHasKey('service_id', $listed);
    }

    public function test_tour_guides_are_optional_and_calculated_per_guide(): void
    {
        $pricing = app(EducationalTourBookingService::class)->calculate($this->program, 60, 4);
        $this->assertSame(0, $pricing['required_chaperones']);
        $this->assertSame(4, $pricing['chargeable_tour_guide_count']);
        $this->assertEquals(126000, $pricing['subtotal']);

        // Optional: 0 tour guides is allowed without exception
        $pricingNoGuides = app(EducationalTourBookingService::class)->calculate($this->program, 60, 0);
        $this->assertSame(0, $pricingNoGuides['tour_guide_count']);
        $this->assertEquals(120000, $pricingNoGuides['subtotal']);
    }

    public function test_group_checkout_creates_multi_vehicle_booking_and_invoice(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/sales/educational-bookings', $this->payload());

        $response->assertCreated()->assertJsonPath('data.status', 'confirmed')->assertJsonCount(2, 'data.vehicles');
        $this->assertArrayNotHasKey('service_id', $response->json('data.program'));
        $bookingId = $response->json('data.id');
        $this->assertDatabaseCount('educational_tour_vehicles', 2);
        $this->assertDatabaseHas('educational_tour_bookings', ['school_name' => 'JVD Academy', 'student_count' => 60, 'chaperone_count' => 3]);
        $this->assertDatabaseHas('invoices', ['customer_name' => 'JVD Academy', 'total_amount' => 139440]);
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $response->json('data.invoice.id'),
            'service_id' => null,
            'item_name' => 'Science Discovery Tour - Students',
            'service_type' => 'educational_tour',
            'quantity' => 60,
        ]);
        $this->actingAs($this->user)->get("/api/v1/sales/educational-bookings/{$bookingId}/manifest")
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_shared_sales_checkout_accepts_an_educational_program_as_a_bespoke_line(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/billing', $this->sharedCheckoutPayload());

        $response->assertCreated();
        $invoiceId = $response->json('data.id');
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoiceId,
            'service_id' => null,
            'item_name' => 'Educational Tour: JVD Academy (Science Discovery Tour)',
            'service_type' => 'educational_tour',
            'quantity' => 1,
            'total_price' => 124500,
        ]);
        $this->assertDatabaseHas('educational_tour_bookings', [
            'invoice_id' => $invoiceId,
            'school_name' => 'JVD Academy',
            'student_count' => 60,
            'chaperone_count' => 3,
            'pickup_location' => 'School Main Gate',
        ]);
        $tickets = TripTicket::where('invoice_id', $invoiceId)->orderBy('assignment_index')->get();
        $this->assertCount(2, $tickets);
        $this->assertSame([$this->busOne->id, $this->busTwo->id], $tickets->pluck('bus_id')->all());
        $this->assertSame([$this->driverOne->id, $this->driverTwo->id], $tickets->pluck('driver_id')->all());
        $this->assertSame([49, 14], $tickets->pluck('no_of_passengers')->all());
        $this->assertSame(['School Main Gate', 'School Main Gate'], $tickets->pluck('pick_up')->all());
        $this->assertSame(['Planetarium', 'Planetarium'], $tickets->pluck('drop_off')->all());
        $this->assertDatabaseCount('work_orders', 2);
    }

    public function test_contract_draft_preserves_the_bespoke_educational_checkout_line(): void
    {
        $payload = $this->sharedCheckoutPayload();
        $payload['custom_transaction_detail'] = [
            'category' => 'educational_tour',
            'school_name' => 'JVD Academy',
            'grade_level' => 'Grade 10',
            'expected_pax' => 63,
            'destination' => 'Science Discovery Tour',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/contracts/draft', $payload)
            ->assertCreated();

        $contract = Contract::latest('id')->firstOrFail();
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $contract->invoice_id,
            'service_id' => null,
            'item_name' => 'Educational Tour: JVD Academy (Science Discovery Tour)',
            'service_type' => 'educational_tour',
            'total_price' => 124500,
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/v1/contracts/{$contract->id}/sign", [
                'signature_image' => 'data:image/png;base64,dGVzdA==',
                'signature_typed_name' => 'Teacher Reyes',
            ])
            ->assertOk();

        $this->assertDatabaseHas('educational_tour_bookings', [
            'invoice_id' => $contract->invoice_id,
            'school_name' => 'JVD Academy',
            'student_count' => 60,
            'chaperone_count' => 3,
        ]);
    }

    public function test_every_traveler_must_be_allocated_to_exactly_one_vehicle(): void
    {
        $payload = $this->payload();
        $payload['assignments'][1]['planned_passengers'] = 10;
        $this->actingAs($this->user)->postJson('/api/v1/sales/educational-bookings', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('assignments');
        $this->assertSame(0, EducationalTourBooking::count());
    }

    public function test_vehicle_and_driver_cannot_overlap_an_existing_school_tour(): void
    {
        $this->actingAs($this->user)->postJson('/api/v1/sales/educational-bookings', $this->payload())->assertCreated();
        $payload = $this->payload();
        $payload['school_name'] = 'Second School';
        $payload['assignments'][0]['driver_id'] = User::factory()->create(['role' => 'driver', 'is_active' => true])->id;
        $payload['assignments'][1]['bus_id'] = Bus::create(['plate_number' => 'EDU-03', 'model' => 'Coaster 2', 'vehicle_type' => 'coaster', 'seating_capacity' => 20, 'status' => 'available'])->id;
        $payload['assignments'][1]['driver_id'] = User::factory()->create(['role' => 'driver', 'is_active' => true])->id;

        $this->actingAs($this->user)->postJson('/api/v1/sales/educational-bookings', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('assignments.0.bus_id');
    }

    public function test_active_school_booking_can_update_fleet_blueprint_and_manifest(): void
    {
        $created = $this->actingAs($this->user)
            ->postJson('/api/v1/sales/educational-bookings', $this->payload())
            ->assertCreated();
        $bookingId = $created->json('data.id');
        $payload = $this->payload();
        unset($payload['program_id'], $payload['student_count'], $payload['chaperone_count'], $payload['payment_method'], $payload['payment_type'], $payload['amount_received']);
        $payload['school_name'] = 'Updated JVD Academy';
        $payload['booking_mode'] = 'selected_seats';
        $payload['selected_seats'] = ['EDU-01-1A'];
        $payload['passengers'] = [['first_name' => 'Maria', 'last_name' => 'Santos', 'role' => 'student', 'seat_code' => 'EDU-01-1A']];

        $this->actingAs($this->user)->putJson("/api/v1/sales/educational-bookings/{$bookingId}", $payload)
            ->assertOk()
            ->assertJsonPath('data.school_name', 'Updated JVD Academy')
            ->assertJsonPath('data.selected_seats.0', 'EDU-01-1A')
            ->assertJsonPath('data.passengers.0.first_name', 'Maria')
            ->assertJsonCount(2, 'data.vehicles');
    }

    private function payload(): array
    {
        $start = now()->addMonth()->setTime(5, 0);

        return [
            'program_id' => $this->program->id, 'school_name' => 'JVD Academy', 'contact_person' => 'Teacher Reyes',
            'contact_email' => 'teacher@example.com', 'contact_number' => '09171234567', 'grade_level' => 'Grade 10',
            'starts_at' => $start->toIso8601String(), 'ends_at' => $start->copy()->addHours(14)->toIso8601String(),
            'pickup_location' => 'School Main Gate', 'student_count' => 60, 'chaperone_count' => 3,
            'assignments' => [
                ['bus_id' => $this->busOne->id, 'driver_id' => $this->driverOne->id, 'planned_passengers' => 49],
                ['bus_id' => $this->busTwo->id, 'driver_id' => $this->driverTwo->id, 'planned_passengers' => 14],
            ],
            'payment_method' => 'Cash', 'payment_type' => 'full', 'amount_received' => 139440,
        ];
    }

    private function sharedCheckoutPayload(): array
    {
        $start = now()->addMonths(2)->setTime(5, 0);

        return [
            'customer_name' => 'JVD Academy',
            'customer_email' => 'teacher@example.com',
            'customer_contact' => '09171234567',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 139440,
            'tax_rate' => 0.12,
            'pickup_location' => 'School Main Gate',
            'tour_code' => 'Science Discovery Tour',
            'pax_count' => 63,
            'bus_id' => $this->busOne->id,
            'driver_id' => $this->driverOne->id,
            'departure_datetime' => $start->toIso8601String(),
            'arrival_datetime' => $start->copy()->addHours(14)->toIso8601String(),
            'items' => [[
                'service_id' => null,
                'item_name' => 'Educational Tour: JVD Academy (Science Discovery Tour)',
                'service_type' => 'educational_tour',
                'quantity' => 1,
                'unit_price' => 124500,
                'item_metadata' => [
                    'program_id' => $this->program->id,
                    'school_name' => 'JVD Academy',
                    'contact_person' => 'Teacher Reyes',
                    'contact_email' => 'teacher@example.com',
                    'contact_number' => '09171234567',
                    'grade_level' => 'Grade 10',
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $start->copy()->addHours(14)->toIso8601String(),
                    'pickup_location' => 'School Main Gate',
                    'destination' => 'Science Discovery Tour',
                    'student_count' => 60,
                    'tour_guide_count' => 3,
                    'booking_mode' => 'selected_seats',
                    'selected_seats' => array_map(fn (int $seat) => "Seat {$seat}", range(1, 63)),
                    'assignments' => [
                        ['bus_id' => $this->busOne->id, 'driver_id' => $this->driverOne->id, 'planned_passengers' => 49],
                        ['bus_id' => $this->busTwo->id, 'driver_id' => $this->driverTwo->id, 'planned_passengers' => 14],
                    ],
                ],
            ]],
        ];
    }
}
