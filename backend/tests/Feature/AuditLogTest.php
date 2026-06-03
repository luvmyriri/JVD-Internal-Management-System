<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->agent      = User::factory()->create(['role' => 'reservation_officer']);
    }

    public function test_admin_can_list_audit_logs()
    {
        AuditLog::factory(10)->create();

        $this->actingAs($this->superAdmin)
             ->getJson('/api/audit-logs')
             ->assertOk()
             ->assertJsonPath('success', true)
             ->assertJsonStructure(['data', 'meta']);
    }

    public function test_agent_cannot_access_audit_logs()
    {
        $this->actingAs($this->agent)
             ->getJson('/api/audit-logs')
             ->assertForbidden();
    }

    public function test_filter_by_user_id()
    {
        $user = User::factory()->create();
        AuditLog::factory(3)->create(['user_id' => $user->id]);
        AuditLog::factory(2)->create(['user_id' => $this->agent->id]);

        $this->actingAs($this->superAdmin)
             ->getJson("/api/audit-logs?user_id={$user->id}")
             ->assertOk()
             ->assertJsonCount(3, 'data');
    }

    public function test_filter_by_action()
    {
        AuditLog::factory(4)->create(['action' => 'POST']);
        AuditLog::factory(2)->create(['action' => 'DELETE']);

        $this->actingAs($this->superAdmin)
             ->getJson('/api/audit-logs?action=POST')
             ->assertOk()
             ->assertJsonCount(4, 'data');
    }

    public function test_filter_by_date_range()
    {
        AuditLog::factory(3)->create(['created_at' => now()->subDays(5)]);
        AuditLog::factory(2)->create(['created_at' => now()->subDays(30)]);

        $from = now()->subDays(10)->toDateString();
        $to   = now()->toDateString();

        $this->actingAs($this->superAdmin)
             ->getJson("/api/audit-logs?date_from={$from}&date_to={$to}")
             ->assertOk()
             ->assertJsonCount(3, 'data');
    }
}
