<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = ['user_id', 'category', 'channel', 'enabled'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }

    /** Notification categories a user can tune. */
    public const CATEGORIES = [
        'approvals' => 'Approvals awaiting you',
        'system'    => 'System alerts',
        'billing'   => 'Billing & payments',
        'documents' => 'Documents',
    ];

    /** Delivery channels a preference can target. */
    public const CHANNELS = ['in_app', 'email'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Whether the user wants this category on this channel. Opt-out: defaults to true
     * unless an explicit row disables it.
     */
    public static function wants(User $user, string $category, string $channel): bool
    {
        $pref = self::where('user_id', $user->id)
            ->where('category', $category)
            ->where('channel', $channel)
            ->first();

        return $pref ? (bool) $pref->enabled : true;
    }
}
