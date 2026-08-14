<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\RolePermission;
use App\Models\User;
use App\Notifications\AccountInvitation;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::factory()->superAdmin()->create();
        $this->agent = User::factory()->create(['role' => 'reservation_officer']);
    }

    // ── List ──────────────────────────────────────────────

    public function test_admin_can_list_users()
    {
        User::factory(5)->create();

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/users');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_agent_cannot_list_users()
    {
        $this->actingAs($this->agent)
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    // ── Create ────────────────────────────────────────────

    public function test_admin_can_create_user()
    {
        Notification::fake();

        $payload = [
            'employee_id' => 'EMP-9901',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'email' => 'maria.santos@jvd.com',
            'password' => 'SecurePass123!',
            'role' => 'accounting_executive',
            'department' => 'Finance',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/users', $payload)
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'maria.santos@jvd.com')
            ->assertJsonPath('data.invitation_sent', true)
            ->assertJsonMissingPath('data.temporary_password');

        $created = User::findOrFail($response->json('data.user.id'));
        Notification::assertSentTo($created, AccountInvitation::class);
    }

    public function test_cannot_create_user_with_duplicate_email()
    {
        $existing = User::factory()->create(['email' => 'dup@jvd.com']);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/users', [
                'employee_id' => 'EMP-9902',
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'email' => 'dup@jvd.com',
                'password' => 'SecurePass123!',
                'role' => 'reservation_officer',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    // ── Deactivate / Activate ─────────────────────────────

    public function test_admin_can_deactivate_a_user()
    {
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$target->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertFalse((bool) $target->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_super_admin()
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$superAdmin->id}/deactivate")
            ->assertForbidden();
    }

    public function test_admin_can_activate_a_deactivated_user()
    {
        $target = User::factory()->inactive()->create();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$target->id}/activate")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertTrue((bool) $target->fresh()->is_active);
    }

    // ── Reset Password ────────────────────────────────────

    public function test_admin_can_reset_password()
    {
        Notification::fake();
        $target = User::factory()->create([
            'role' => 'reservation_officer',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$target->id}/reset-password")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.setup_link_sent', true)
            ->assertJsonMissingPath('data.temporary_password');

        $this->assertTrue($target->fresh()->must_change_password);
        $this->assertFalse(Hash::check('OldPassword123!', $target->fresh()->password));
        Notification::assertSentTo(
            $target,
            AccountInvitation::class,
            fn ($notification) => $notification->isPasswordReset
        );
    }

    public function test_non_super_admin_cannot_access_super_admin_routes()
    {
        // Test role-permissions route (Super Admin exclusive)
        $this->actingAs($this->agent)
            ->getJson('/api/v1/role-permissions')
            ->assertForbidden();
    }

    public function test_direct_administrator_password_endpoint_is_not_registered()
    {
        $target = User::factory()->create([
            'role' => 'reservation_officer',
            'password' => Hash::make('ExistingPassword123!'),
        ]);
        $originalPasswordHash = $target->password;

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/users/{$target->id}/set-password", [
                'new_password' => 'AdministratorChosen123!',
                'new_password_confirmation' => 'AdministratorChosen123!',
            ])
            ->assertNotFound();

        $this->assertSame($originalPasswordHash, $target->fresh()->password);
    }

    public function test_non_super_admin_cannot_create_user_with_super_admin_role()
    {
        $payload = [
            'employee_id' => 'EMP-9903',
            'first_name' => 'Hack',
            'last_name' => 'Admin',
            'email' => 'hack@jvd.com',
            'password' => 'SecurePass123!',
            'role' => 'super_admin',
        ];

        // Agent does not have permission anyway, but let's test a user role that *does* have admin create permission, e.g. a regular manager with create permissions.
        // Wait, does agent have admin:create? Let's check: in setUp we do RolePermissionSeeder.
        // Let's create an office staff or custom user with admin:create permission but role is not super_admin.
        $manager = User::factory()->create(['role' => 'operations_manager']);
        // Assign create permission on 'admin' module to manager
        RolePermission::updateOrCreate(
            ['role' => 'operations_manager', 'module' => 'admin'],
            ['can_create' => true, 'can_view' => true]
        );

        $this->actingAs($manager)
            ->postJson('/api/v1/users', $payload)
            ->assertForbidden();
    }

    public function test_super_admin_can_create_user_with_super_admin_role()
    {
        Notification::fake();

        $payload = [
            'employee_id' => 'EMP-9904',
            'first_name' => 'New',
            'last_name' => 'Super',
            'email' => 'newsuper@jvd.com',
            'password' => 'SecurePass123!',
            'role' => 'super_admin',
        ];

        $this->actingAs($this->admin)
            ->postJson('/api/v1/users', $payload)
            ->assertCreated()
            ->assertJsonMissingPath('data.temporary_password');
    }

    public function test_operations_manager_can_still_create_ordinary_staff_account()
    {
        Notification::fake();
        $manager = User::factory()->create(['role' => 'operations_manager']);

        $response = $this->actingAs($manager)
            ->postJson('/api/v1/users', [
                'employee_id' => 'EMP-ORDINARY-STAFF',
                'first_name' => 'Ordinary',
                'last_name' => 'Staff',
                'email' => 'ordinary.staff@jvd.test',
                'role' => 'reservation_officer',
                'department' => 'Reservations',
            ])
            ->assertCreated()
            ->assertJsonPath('data.invitation_sent', true)
            ->assertJsonMissingPath('data.temporary_password');

        $created = User::findOrFail($response->json('data.user.id'));
        Notification::assertSentTo($created, AccountInvitation::class);
    }

    public function test_operations_manager_cannot_create_accounting_or_purchasing_managers(): void
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);

        foreach (['accounting_executive', 'purchasing_manager'] as $index => $role) {
            $email = "privileged.{$index}@jvd.test";

            $this->actingAs($manager)
                ->postJson('/api/v1/users', [
                    'employee_id' => "EMP-PRIVILEGED-{$index}",
                    'first_name' => 'Privileged',
                    'last_name' => 'Attempt',
                    'email' => $email,
                    'role' => $role,
                    'department' => 'Operations',
                ])
                ->assertForbidden();

            $this->assertDatabaseMissing('users', ['email' => $email]);
        }
    }

    public function test_dynamic_hr_editor_cannot_promote_staff_into_accounting_or_purchasing_management(): void
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);

        foreach (['accounting_executive', 'purchasing_manager'] as $role) {
            $target = User::factory()->create(['role' => 'reservation_officer']);

            $this->actingAs($manager)
                ->putJson("/api/v1/users/{$target->id}", ['role' => $role])
                ->assertForbidden();

            $this->assertSame('reservation_officer', $target->fresh()->role);
        }
    }

    public function test_non_super_admin_cannot_update_user_role_to_super_admin()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($manager)
            ->putJson("/api/v1/users/{$target->id}", [
                'role' => 'super_admin',
            ])
            ->assertForbidden();
    }

    public function test_non_super_admin_cannot_assign_executive_vice_president_role()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);
        $target = User::factory()->create(['role' => 'reservation_officer']);

        $this->actingAs($manager)
            ->putJson("/api/v1/users/{$target->id}", ['role' => 'executive_vice_president'])
            ->assertForbidden();

        $this->assertSame('reservation_officer', $target->fresh()->role);
    }

    public function test_non_super_admin_cannot_create_executive_vice_president_account()
    {
        $evp = User::factory()->create(['role' => 'executive_vice_president']);

        $this->actingAs($evp)
            ->postJson('/api/v1/users', [
                'employee_id' => 'EMP-EVP-ESCALATION',
                'first_name' => 'Second',
                'last_name' => 'Executive',
                'email' => 'second.executive@jvd.test',
                'role' => 'executive_vice_president',
                'department' => 'Executive',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'second.executive@jvd.test']);
    }

    public function test_operations_manager_cannot_convert_applicant_to_executive_account()
    {
        Notification::fake();
        $manager = User::factory()->create(['role' => 'operations_manager']);
        $application = JobApplication::create([
            'first_name' => 'Executive',
            'last_name' => 'Candidate',
            'email' => 'executive.candidate@jvd.test',
            'position_applied' => 'Executive',
            'status' => 'hired',
        ]);

        $this->actingAs($manager)
            ->postJson("/api/v1/job-applications/{$application->id}/convert-to-employee", [
                'role' => 'executive_vice_president',
                'department' => 'Executive',
                'send_invitation' => true,
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'executive.candidate@jvd.test']);
        Notification::assertNothingSent();
    }

    public function test_user_cannot_escalate_their_own_role()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);

        $this->actingAs($manager)
            ->putJson("/api/v1/users/{$manager->id}", ['role' => 'executive_vice_president'])
            ->assertForbidden();

        $this->assertSame('operations_manager', $manager->fresh()->role);
    }

    public function test_operations_manager_cannot_reset_protected_account()
    {
        Notification::fake();
        $manager = User::factory()->create(['role' => 'operations_manager']);
        $executive = User::factory()->create([
            'role' => 'executive_vice_president',
            'password' => Hash::make('ExecutivePassword123!'),
        ]);
        $oldPasswordHash = $executive->password;

        $this->actingAs($manager)
            ->postJson("/api/v1/users/{$executive->id}/reset-password")
            ->assertForbidden();

        $this->assertSame($oldPasswordHash, $executive->fresh()->password);
        Notification::assertNothingSent();
    }

    public function test_administrative_password_reset_cannot_target_self()
    {
        $oldPasswordHash = $this->admin->password;

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$this->admin->id}/reset-password")
            ->assertForbidden();

        $this->assertSame($oldPasswordHash, $this->admin->fresh()->password);
    }

    public function test_inactive_account_must_be_activated_before_password_reset()
    {
        Notification::fake();
        $target = User::factory()->inactive()->create([
            'role' => 'reservation_officer',
            'password' => Hash::make('InactivePassword123!'),
        ]);
        $oldPasswordHash = $target->password;

        $this->actingAs($this->admin)
            ->postJson("/api/v1/users/{$target->id}/reset-password")
            ->assertUnprocessable();

        $this->assertSame($oldPasswordHash, $target->fresh()->password);
        Notification::assertNothingSent();
    }

    public function test_non_super_admin_cannot_update_super_admin_user()
    {
        $manager = User::factory()->create(['role' => 'operations_manager']);

        $this->actingAs($manager)
            ->putJson("/api/v1/users/{$this->admin->id}", [
                'first_name' => 'HackName',
            ])
            ->assertForbidden();
    }

    public function test_super_admin_can_update_super_admin_user()
    {
        $otherAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/users/{$otherAdmin->id}", [
                'first_name' => 'NewName',
            ])
            ->assertOk();

        $this->assertEquals('NewName', $otherAdmin->fresh()->first_name);
    }

    public function test_admin_can_update_user_email_and_employee_id()
    {
        $target = User::factory()->create([
            'email' => 'old.email@jvd.com',
            'employee_id' => 'EMP-1111',
            'role' => 'reservation_officer',
        ]);

        $res = $this->actingAs($this->admin)
            ->putJson("/api/v1/users/{$target->id}", [
                'email' => 'new.email@jvd.com',
                'employee_id' => 'EMP-2222',
                'first_name' => 'UpdatedFirst',
                'last_name' => 'UpdatedLast',
            ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'new.email@jvd.com')
            ->assertJsonPath('data.employee_id', 'EMP-2222');

        $fresh = $target->fresh();
        $this->assertEquals('new.email@jvd.com', $fresh->email);
        $this->assertEquals('EMP-2222', $fresh->employee_id);
    }
}
