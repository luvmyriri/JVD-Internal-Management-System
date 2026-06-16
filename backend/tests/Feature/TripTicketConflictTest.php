<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Bus;
use App\Models\TripTicket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripTicketConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $driver1;
    private User $driver2;
    private Bus $bus1;
    private Bus $bus2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->superAdmin()->create([
            'employee_id' => 'ADM001',
        ]);

        $this->driver1 = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV001',
        ]);
        $this->driver2 = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV002',
        ]);

        $this->bus1 = Bus::factory()->create([
            'assigned_driver' => $this->driver1->id,
            'plate_number' => 'AAA-1111',
        ]);
        $this->bus2 = Bus::factory()->create([
            'assigned_driver' => $this->driver2->id,
            'plate_number' => 'BBB-2222',
        ]);
    }

    public function test_can_create_trip_ticket_without_conflict()
    {
        $payload = [
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/trip-tickets', $payload);

        $response->assertCreated();
    }

    public function test_cannot_create_trip_ticket_with_driver_conflict()
    {
        // Create initial trip ticket
        TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
            'status' => 'draft',
        ]);

        // Try to create another ticket for same driver on same date
        $payload = [
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Cavite',
            'no_of_passengers' => 25,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus2->id, // Different bus, same driver
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/trip-tickets', $payload);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'success' => false,
        ]);
        $this->assertStringContainsString('The selected driver is already assigned', $response->json('message'));
    }

    public function test_cannot_create_trip_ticket_with_bus_conflict()
    {
        // Create initial trip ticket
        TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
            'status' => 'draft',
        ]);

        // Try to create another ticket for same bus on same date
        $payload = [
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Cavite',
            'no_of_passengers' => 25,
            'driver_id' => $this->driver2->id, // Different driver, same bus
            'bus_id' => $this->bus1->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/trip-tickets', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('The selected vehicle is already assigned', $response->json('message'));
    }

    public function test_can_update_trip_ticket_without_causing_self_conflict()
    {
        $ticket = TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/trip-tickets/{$ticket->id}", [
                'pick_up' => 'New Pick Up Spot',
            ]);

        $response->assertOk();
    }

    public function test_update_respects_other_tickets_conflicts()
    {
        // Ticket A
        $ticketA = TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
            'status' => 'draft',
        ]);

        // Ticket B
        $ticketB = TripTicket::create([
            'control_no' => 'DTT-2026-0002',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Cavite',
            'no_of_passengers' => 25,
            'driver_id' => $this->driver2->id,
            'bus_id' => $this->bus2->id,
            'status' => 'draft',
        ]);

        // Try to update Ticket B's driver to Driver 1 (conflicts with Ticket A)
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/trip-tickets/{$ticketB->id}", [
                'driver_id' => $this->driver1->id,
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('The selected driver is already assigned', $response->json('message'));
    }

    public function test_proactive_check_conflict_endpoint()
    {
        TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'Manila',
            'drop_off' => 'Laguna',
            'no_of_passengers' => 30,
            'driver_id' => $this->driver1->id,
            'bus_id' => $this->bus1->id,
            'status' => 'draft',
        ]);

        // Test check-conflict endpoint for Driver 1 on same date
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/trip-tickets/check-conflict?date_of_travel=2026-06-20&driver_id={$this->driver1->id}");

        $response->assertOk();
        $response->assertJsonPath('has_conflict', true);
        $response->assertJsonCount(1, 'conflicts');
        $this->assertEquals('driver', $response->json('conflicts.0.type'));

        // Test check-conflict endpoint for Driver 2 (should be clear)
        $response2 = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/trip-tickets/check-conflict?date_of_travel=2026-06-20&driver_id={$this->driver2->id}");

        $response2->assertOk();
        $response2->assertJsonPath('has_conflict', false);
    }
}
