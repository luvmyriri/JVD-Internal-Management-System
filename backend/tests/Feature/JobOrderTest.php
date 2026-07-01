<?php

namespace Tests\Feature;

use App\Models\JobOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->agent = User::factory()->create(['role' => 'purchasing_manager']);
        $this->admin = User::factory()->superAdmin()->create();
    }

    private function validPayload(array $overrides = []): array
    {
        // Customer and Bus IDs must exist; tests that need them
        // should create those records separately (Sprint 3).
        // For now, we test validation and state transitions using factories.
        return array_merge([
            'customer_id'  => 1,
            'bus_id'       => 1,
            'service_type' => 'charter',
            'service_date' => now()->addDays(5)->toDateString(),
            'destination'  => 'Tagaytay City',
            'total_cost'   => 15000,
        ], $overrides);
    }

    public function test_agent_can_list_only_their_job_orders()
    {
        JobOrder::factory(2)->create(['created_by' => $this->agent->id]);
        JobOrder::factory(3)->create(['created_by' => $this->admin->id]);

        $res = $this->actingAs($this->agent)->getJson('/api/job-orders');

        $res->assertOk();
        $this->assertCount(2, $res->json('data'));
    }

    public function test_admin_can_see_all_job_orders()
    {
        JobOrder::factory(5)->create();

        $this->actingAs($this->admin)
             ->getJson('/api/job-orders')
             ->assertOk()
             ->assertJsonPath('meta.total', 5);
    }

    public function test_invalid_status_transition_returns_422()
    {
        $jo = JobOrder::factory()->create([
            'status'     => 'draft',
            'created_by' => $this->agent->id,
        ]);

        // Cannot go from draft → completed (must go through confirmed, in_progress first)
        $this->actingAs($this->agent)
             ->putJson("/api/job-orders/{$jo->id}", ['status' => 'completed'])
             ->assertUnprocessable();
    }

    public function test_valid_status_transition_draft_to_confirmed()
    {
        $jo = JobOrder::factory()->create([
            'status'       => 'draft',
            'created_by'   => $this->agent->id,
            'service_type' => 'maintenance',
        ]);

        $this->actingAs($this->agent)
             ->putJson("/api/job-orders/{$jo->id}", ['status' => 'confirmed'])
             ->assertOk()
             ->assertJsonPath('data.status', 'confirmed');
    }

    public function test_travel_job_order_cannot_be_confirmed_without_bus_and_driver()
    {
        $jo = JobOrder::factory()->create([
            'status'       => 'draft',
            'created_by'   => $this->agent->id,
            'service_type' => 'bus_rental',
            'bus_id'       => null,
            'driver_id'    => null,
        ]);

        $this->actingAs($this->agent)
             ->putJson("/api/job-orders/{$jo->id}", ['status' => 'confirmed'])
             ->assertStatus(422);
    }

    public function test_agent_cannot_update_another_agents_job_order()
    {
        $otherAgent = User::factory()->create(['role' => 'purchasing_manager']);
        $jo = JobOrder::factory()->create([
            'status'     => 'draft',
            'created_by' => $otherAgent->id,
        ]);

        $this->actingAs($this->agent)
             ->putJson("/api/job-orders/{$jo->id}", ['destination' => 'Hacked'])
             ->assertForbidden();
    }

    public function test_status_filter_works()
    {
        JobOrder::factory(2)->create(['status' => 'draft']);
        JobOrder::factory(3)->create(['status' => 'confirmed']);

        $this->actingAs($this->admin)
             ->getJson('/api/job-orders?status=draft')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    public function test_can_create_job_order_with_items()
    {
        $bus = \App\Models\Bus::factory()->create();
        $payload = [
            'bus_id'       => $bus->id,
            'service_type' => 'maintenance',
            'service_date' => now()->toDateString(),
            'total_cost'   => 4300.00,
            'notes'        => 'Routine PMS with auto-recommended items',
            'items'        => [
                [
                    'item_no'          => 'PMS-001',
                    'item_description' => 'Engine Oil 15W-40',
                    'quantity'         => 10,
                    'unit_cost'        => 350.00,
                ],
                [
                    'item_no'          => 'PMS-002',
                    'item_description' => 'Oil Filter',
                    'quantity'         => 1,
                    'unit_cost'        => 800.00,
                ]
            ]
        ];


        $res = $this->actingAs($this->admin)
                    ->postJson('/api/job-orders', $payload);

        $res->assertCreated();
        
        $this->assertDatabaseHas('job_orders', [
            'id' => $res->json('data.id'),
            'service_type' => 'maintenance',
        ]);

        $this->assertDatabaseHas('job_order_items', [
            'job_order_id'     => $res->json('data.id'),
            'item_no'          => 'PMS-001',
            'quantity'         => 10,
            'unit_cost'        => 350.00,
        ]);

        $this->assertDatabaseHas('job_order_items', [
            'job_order_id'     => $res->json('data.id'),
            'item_no'          => 'PMS-002',
            'quantity'         => 1,
            'unit_cost'        => 800.00,
        ]);
    }
}

