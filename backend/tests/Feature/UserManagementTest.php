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
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->admin = User::factory()->superAdmin()->create();
        $this->agent = User::factory()->create(['role' => 'reservation_officer']);
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
            'role'        => 'accounting_executive',
            'department'  => 'Finance',
        ];

        $this->actingAs($this->admin)
             ->postJson('/api/users', $payload)
             ->assertCreated()
             ->assertJsonPath('data.user.email', 'maria.santos@jvd.com');
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
                 'role'        => 'reservation_officer',
             ])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['email']);
    }

    // ── Deactivate / Activate ─────────────────────────────

    public function test_admin_can_deactivate_a_user()
    {
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$target->id}/deactivate")
             ->assertOk()
             ->assertJsonPath('success', true);

        $this->assertFalse((bool)$target->fresh()->is_active);
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
             ->assertJsonPath('success', true);
             
        $this->assertTrue((bool)$target->fresh()->is_active);
    }

    // ── Reset Password ────────────────────────────────────

    public function test_admin_can_reset_password()
    {
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($this->admin)
             ->postJson("/api/users/{$target->id}/reset-password", [
                 'password' => 'NewPass123!',
             ])
             ->assertOk()
             ->assertJsonPath('success', true);

        $this->assertTrue($target->fresh()->must_change_password);
    }

    public function test_non_super_admin_cannot_access_super_admin_routes()
    {
        $target = User::factory()->create(['role' => 'reservation_officer']);

        // Test set-password route (Super Admin exclusive)
        $this->actingAs($this->agent)
             ->patchJson("/api/users/{$target->id}/set-password", [
                 'password' => 'NewPass123!',
             ])
             ->assertForbidden();

        // Test role-permissions route (Super Admin exclusive)
        $this->actingAs($this->agent)
             ->getJson('/api/role-permissions')
             ->assertForbidden();
    }

    public function test_non_super_admin_cannot_create_user_with_super_admin_role()
    {
        $payload = [
            'employee_id' => 'EMP-9903',
            'first_name'  => 'Hack',
            'last_name'   => 'Admin',
            'email'       => 'hack@jvd.com',
            'password'    => 'SecurePass123!',
            'role'        => 'super_admin',
        ];

        // Agent does not have permission anyway, but let's test a user role that *does* have admin create permission, e.g. a regular manager with create permissions.
        // Wait, does agent have admin:create? Let's check: in setUp we do RolePermissionSeeder.
        // Let's create an office staff or custom user with admin:create permission but role is not super_admin.
        $manager = User::factory()->create(['role' => 'operations_manager']);
        // Assign create permission on 'admin' module to manager
        \App\Models\RolePermission::updateOrCreate(
            ['role' => 'operations_manager', 'module' => 'admin'],
            ['can_create' => true, 'can_view' => true]
        );

        $this->actingAs($manager)
             ->postJson('/api/users', $payload)
             ->assertForbidden();
    }

    public function test_super_admin_can_create_user_with_super_admin_role()
    {
        $payload = [
            'employee_id' => 'EMP-9904',
            'first_name'  => 'New',
            'last_name'   => 'Super',
            'email'       => 'newsuper@jvd.com',
            'password'    => 'SecurePass123!',
            'role'        => 'super_admin',
        ];

        $this->actingAs($this->admin)
             ->postJson('/api/users', $payload)
             ->assertCreated();
    }

    public function test_non_super_admin_cannot_update_user_role_to_super_admin()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($manager)
             ->putJson("/api/users/{$target->id}", [
                 'role' => 'super_admin',
             ])
             ->assertForbidden();
    }

    public function test_non_super_admin_cannot_update_super_admin_user()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);

        $this->actingAs($manager)
             ->putJson("/api/users/{$this->admin->id}", [
                 'first_name' => 'HackName',
             ])
             ->assertForbidden();
    }

    public function test_super_admin_can_update_super_admin_user()
    {
        $otherAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($this->admin)
             ->putJson("/api/users/{$otherAdmin->id}", [
                 'first_name' => 'NewName',
             ])
             ->assertOk();

        $this->assertEquals('NewName', $otherAdmin->fresh()->first_name);
    }
}
