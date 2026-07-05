<?php

namespace Tests\Feature;

use App\Models\RoleAbility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbilitiesTest extends TestCase
{
    use RefreshDatabase;

    private function grant(string $role, string $ability): void
    {
        RoleAbility::create(['role' => $role, 'ability' => $ability]);
        RoleAbility::flushCache($role);
    }

    public function test_super_admin_has_every_ability(): void
    {
        $u = User::factory()->superAdmin()->create();
        $this->assertTrue($u->hasAbility('cash_budgets.disburse'));
        $this->assertTrue($u->hasAbility('invoices.finalize'));
    }

    public function test_role_grant_resolves(): void
    {
        $this->grant('accounting_executive', 'cash_budgets.approve_accounting');
        $u = User::factory()->create(['role' => 'accounting_executive']);

        $this->assertTrue($u->hasAbility('cash_budgets.approve_accounting'));
        $this->assertFalse($u->hasAbility('cash_budgets.disburse'));
    }

    public function test_per_user_grant_override(): void
    {
        $u = User::factory()->create([
            'role' => 'office_staff',
            'custom_abilities' => ['grant' => ['invoices.finalize']],
        ]);

        $this->assertTrue($u->hasAbility('invoices.finalize'));
    }

    public function test_per_user_revoke_beats_role_grant(): void
    {
        $this->grant('accounting_executive', 'invoices.finalize');
        $u = User::factory()->create([
            'role' => 'accounting_executive',
            'custom_abilities' => ['revoke' => ['invoices.finalize']],
        ]);

        $this->assertFalse($u->hasAbility('invoices.finalize'));
    }

    public function test_with_ability_returns_only_matching_active_users(): void
    {
        $this->grant('purchasing_manager', 'purchase_orders.verify');
        $match   = User::factory()->create(['role' => 'purchasing_manager', 'is_active' => true]);
        $noMatch = User::factory()->create(['role' => 'driver', 'is_active' => true]);

        $ids = User::withAbility('purchase_orders.verify')->pluck('id');

        $this->assertTrue($ids->contains($match->id));
        $this->assertFalse($ids->contains($noMatch->id));
    }

    public function test_admin_can_update_role_abilities_and_rejects_unknown(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->putJson('/api/v1/role-abilities/accounting_executive', [
                'abilities' => ['cash_budgets.approve_accounting', 'cash_budgets.disburse', 'bogus.not_real'],
            ])
            ->assertOk();

        RoleAbility::flushCache('accounting_executive');
        $stored = RoleAbility::getForRole('accounting_executive');

        $this->assertContains('cash_budgets.approve_accounting', $stored);
        $this->assertContains('cash_budgets.disburse', $stored);
        $this->assertNotContains('bogus.not_real', $stored, 'Unknown abilities must be rejected.');
    }
}
