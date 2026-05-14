<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->agent = User::factory()->create(['role' => 'agent']);
    }

    // ── List ──────────────────────────────────────────────

    public function test_admin_can_list_users()
    {
        User::factory(5)->create();

        $res = $this->actingAs($this->admin)
                    ->getJson('/api/users');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_agent_cannot_list_users()
    {
        $this->actingAs($this->agent)
             ->getJson('/api/users')
             ->assertForbidden();
    }

    // ── Create ────────────────────────────────────────────

    public function test_admin_can_create_user()
    {
        $payload = [
            'employee_id' => 'EMP-9901',
            'first_name'  => 'Maria',
            'last_name'   => 'Santos',
            'email'       => 'maria.santos@jvd.com',
            'password'    => 'SecurePass123!',
            'role'        => 'accounting',
            'department'  => 'Finance',
        ];

        $this->actingAs($this->admin)
             ->postJson('/api/users', $payload)
             ->assertCreated()
             ->assertJsonPath('data.email', 'maria.santos@jvd.com');
    }

    public function test_cannot_create_user_with_duplicate_email()
    {
        $existing = User::factory()->create(['email' => 'dup@jvd.com']);

        $this->actingAs($this->admin)
             ->postJson('/api/users', [
                 'employee_id' => 'EMP-9902',
                 'first_name'  => 'Juan',
                 'last_name'   => 'Dela Cruz',
                 'email'       => 'dup@jvd.com',
                 'password'    => 'SecurePass123!',
                 'role'        => 'agent',
             ])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['email']);
    }

    // ── Deactivate / Activate ─────────────────────────────

    public function test_admin_can_deactivate_a_user()
    {
        $target = User::factory()->create(['role' => 'agent']);

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$target->id}/deactivate")
             ->assertOk()
             ->assertJsonPath('data.is_active', false);
    }

    public function test_admin_cannot_deactivate_super_admin()
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$superAdmin->id}/deactivate")
             ->assertForbidden();
    }

    public function test_admin_can_activate_a_deactivated_user()
    {
        $target = User::factory()->inactive()->create();

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$target->id}/activate")
             ->assertOk()
             ->assertJsonPath('data.is_active', true);
    }

    // ── Reset Password ────────────────────────────────────

    public function test_admin_can_reset_password()
    {
        $target = User::factory()->create(['role' => 'agent']);

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$target->id}/reset-password", [
                 'password' => 'NewPass123!',
             ])
             ->assertOk()
             ->assertJsonPath('success', true);

        $this->assertTrue($target->fresh()->must_change_password);
    }
}
