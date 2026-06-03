<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Notifications\SystemAlert;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user for authentication
        $this->user = User::factory()->create([
            'role' => 'reservation_officer',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    /**
     * Test retrieving notifications.
     */
    public function test_can_list_notifications()
    {
        Sanctum::actingAs($this->user);

        // First assertion: empty notifications list
        $response = $this->getJson(route('notifications.index'));
        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [],
                 ]);

        // Send a notification
        $this->user->notify(new SystemAlert("Test Alert Title", "Test Alert Message", "info", "/some-link"));

        // Second assertion: notifications list contains 1 item
        $response = $this->getJson(route('notifications.index'));
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data')
                 ->assertJsonPath('data.0.title', 'Test Alert Title')
                 ->assertJsonPath('data.0.message', 'Test Alert Message')
                 ->assertJsonPath('data.0.read', false);
    }

    /**
     * Test marking a single notification as read.
     */
    public function test_can_mark_notification_as_read()
    {
        Sanctum::actingAs($this->user);

        // Send a notification
        $this->user->notify(new SystemAlert("Unread Title", "Unread Message", "warning"));
        $notification = $this->user->notifications()->first();

        // Mark it as read
        $response = $this->putJson(route('notifications.read', ['id' => $notification->id]));
        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        // Assert DB state
        $this->assertNotNull($notification->fresh()->read_at);

        // Fetch notifications and verify state
        $response = $this->getJson(route('notifications.index'));
        $response->assertJsonPath('data.0.read', true);
    }

    /**
     * Test marking all notifications as read.
     */
    public function test_can_mark_all_notifications_as_read()
    {
        Sanctum::actingAs($this->user);

        // Send multiple notifications
        $this->user->notify(new SystemAlert("Alert 1", "Message 1"));
        $this->user->notify(new SystemAlert("Alert 2", "Message 2"));

        $this->assertEquals(2, $this->user->unreadNotifications()->count());

        // Mark all as read
        $response = $this->postJson(route('notifications.mark-all-read'));
        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertEquals(0, $this->user->unreadNotifications()->count());
    }

    /**
     * Test dismissing a single notification.
     */
    public function test_can_dismiss_notification()
    {
        Sanctum::actingAs($this->user);

        $this->user->notify(new SystemAlert("Alert to Dismiss", "Message"));
        $notification = $this->user->notifications()->first();

        // Dismiss it
        $response = $this->deleteJson(route('notifications.destroy', ['id' => $notification->id]));
        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertEquals(0, $this->user->notifications()->count());
    }

    /**
     * Test clearing all notifications.
     */
    public function test_can_clear_all_notifications()
    {
        Sanctum::actingAs($this->user);

        $this->user->notify(new SystemAlert("Alert 1", "Message 1"));
        $this->user->notify(new SystemAlert("Alert 2", "Message 2"));

        // Clear all
        $response = $this->deleteJson(route('notifications.clear-all'));
        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertEquals(0, $this->user->notifications()->count());
    }

    /**
     * Test simulating a notification.
     */
    public function test_can_simulate_notification()
    {
        Sanctum::actingAs($this->user);

        // Simulate notification
        $response = $this->postJson(route('notifications.simulate'));
        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Notification simulated successfully.',
                 ])
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'id',
                         'title',
                         'message',
                         'type',
                         'read',
                         'time',
                     ],
                 ]);

        $this->assertEquals(1, $this->user->notifications()->count());
    }
}
