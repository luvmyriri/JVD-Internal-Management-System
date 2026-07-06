<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Characterization tests for the role dashboards (roadmap 2.9 / 2.10). These lock in the
 * current response contract so the DashboardController -> DashboardService extraction
 * cannot silently change what each endpoint returns. Super admin passes every role gate.
 */
class DashboardEndpointsTest extends TestCase
{
    use RefreshDatabase;

    public static function endpoints(): array
    {
        return [['admin'], ['accounting'], ['agent'], ['driver'], ['hr']];
    }

    #[DataProvider('endpoints')]
    public function test_dashboard_endpoint_returns_success_envelope(string $endpoint): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->getJson("/api/v1/dashboards/{$endpoint}")
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => ['kpis']]);
    }
}
