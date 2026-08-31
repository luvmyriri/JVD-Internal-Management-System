<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverPortalAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_account_can_open_driver_dashboard_data(): void
    {
        $driver = User::factory()->create(['role' => 'driver']);

        $this->actingAs($driver)
            ->getJson('/api/v1/dashboards/driver')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_super_admin_cannot_open_driver_dashboard_data(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->getJson('/api/v1/dashboards/driver')
            ->assertForbidden()
            ->assertJsonPath('message', 'The Driver portal is available only to driver accounts. Use Logistics to supervise driver operations.');
    }

    public function test_non_driver_with_driver_permission_cannot_open_driver_dashboard_data(): void
    {
        $supervisor = User::factory()->create([
            'role' => 'logistics_in_charge',
            'custom_permissions' => [
                'driver.overview' => ['can_view' => true],
            ],
        ]);

        $this->actingAs($supervisor)
            ->getJson('/api/v1/dashboards/driver')
            ->assertForbidden();
    }
}
