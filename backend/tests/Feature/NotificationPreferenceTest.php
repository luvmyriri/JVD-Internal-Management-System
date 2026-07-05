<?php

namespace Tests\Feature;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_defaults_to_enabled_when_no_row(): void
    {
        $u = User::factory()->create();
        $this->assertTrue(NotificationPreference::wants($u, 'approvals', 'in_app'));
    }

    public function test_explicit_disable_is_respected(): void
    {
        $u = User::factory()->create();
        NotificationPreference::create([
            'user_id' => $u->id, 'category' => 'system', 'channel' => 'in_app', 'enabled' => false,
        ]);
        $this->assertFalse(NotificationPreference::wants($u, 'system', 'in_app'));
    }

    public function test_muting_a_category_stops_the_in_app_notification(): void
    {
        $muted = User::factory()->create();
        NotificationPreference::create([
            'user_id' => $muted->id, 'category' => 'system', 'channel' => 'in_app', 'enabled' => false,
        ]);
        $normal = User::factory()->create();

        $muted->notify(new SystemAlert('Test', 'Body', 'info'));
        $normal->notify(new SystemAlert('Test', 'Body', 'info'));

        $this->assertSame(0, $muted->notifications()->count(), 'Muted user must not receive the alert.');
        $this->assertSame(1, $normal->notifications()->count(), 'Default user still receives the alert.');
    }

    public function test_endpoint_updates_preferences_and_ignores_unknown_keys(): void
    {
        $u = User::factory()->create();

        $this->actingAs($u)
            ->putJson('/api/v1/notifications/preferences', [
                'preferences' => [
                    'system'      => ['in_app' => false],
                    'not_a_cat'   => ['in_app' => false], // ignored
                    'approvals'   => ['carrier' => true], // unknown channel ignored
                ],
            ])
            ->assertOk();

        $this->assertFalse(NotificationPreference::wants($u->fresh(), 'system', 'in_app'));
        $this->assertSame(1, NotificationPreference::where('user_id', $u->id)->count());
    }
}
