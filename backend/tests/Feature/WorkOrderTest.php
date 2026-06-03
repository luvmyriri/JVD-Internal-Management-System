<?php

namespace Tests\Feature;

use App\Models\WorkOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->admin = User::factory()->superAdmin()->create();
        $this->agent = User::factory()->create(['role' => 'dispatcher']);
    }

    public function test_admin_can_list_work_orders()
    {
        WorkOrder::factory(5)->create();

        $this->actingAs($this->admin)
             ->getJson('/api/work-orders')
             ->assertOk()
             ->assertJsonPath('meta.total', 5);
    }

    public function test_status_filter_returns_correct_records()
    {
        WorkOrder::factory(3)->create(['status' => 'open']);
        WorkOrder::factory(2)->create(['status' => 'in_progress']);

        $this->actingAs($this->admin)
             ->getJson('/api/work-orders?status=open')
             ->assertOk()
             ->assertJsonCount(3, 'data');
    }

    public function test_priority_filter_returns_correct_records()
    {
        WorkOrder::factory(2)->create(['priority' => 'critical']);
        WorkOrder::factory(4)->create(['priority' => 'low']);

        $this->actingAs($this->admin)
             ->getJson('/api/work-orders?priority=critical')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    public function test_valid_status_transition_open_to_in_progress()
    {
        $wo = WorkOrder::factory()->create(['status' => 'open']);

        $this->actingAs($this->admin)
             ->putJson("/api/work-orders/{$wo->id}", ['status' => 'in_progress'])
             ->assertOk()
             ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_invalid_status_transition_returns_422()
    {
        $wo = WorkOrder::factory()->create(['status' => 'open']);

        // open → completed is not a valid transition (must pass through in_progress)
        $this->actingAs($this->admin)
             ->putJson("/api/work-orders/{$wo->id}", ['status' => 'completed'])
             ->assertUnprocessable();
    }

    public function test_can_reassign_work_order()
    {
        $wo       = WorkOrder::factory()->create(['status' => 'open']);
        $mechanic = User::factory()->create(['role' => 'service_adviser']);

        $this->actingAs($this->admin)
             ->putJson("/api/work-orders/{$wo->id}", ['assigned_to' => $mechanic->id])
             ->assertOk()
             ->assertJsonPath('data.assignee.id', $mechanic->id);
    }

    public function test_accounting_user_cannot_access_work_orders()
    {
        $accounting = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($accounting)
             ->getJson('/api/work-orders')
             ->assertForbidden();
    }
}
