<?php

namespace App\Listeners;

use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Notifications\Events\NotificationSending;

/**
 * Roadmap 2.6 — central notification gate. Halts a notification on a channel when the
 * recipient has muted that category/channel, without touching any of the ~10 dispatch
 * sites. Returning false from a NotificationSending listener prevents that send.
 */
class ApplyNotificationPreferences
{
    public function handle(NotificationSending $event): bool
    {
        $notifiable = $event->notifiable;
        if (!$notifiable instanceof User) {
            return true;
        }

        $category = method_exists($event->notification, 'category')
            ? $event->notification->category()
            : 'system';

        $channel = match ($event->channel) {
            'mail'                 => 'email',
            'database', 'broadcast' => 'in_app',
            default                => $event->channel,
        };

        return NotificationPreference::wants($notifiable, $category, $channel);
    }
}
