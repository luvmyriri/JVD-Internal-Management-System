<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Fix avatar_url for all users in the database.
 * Replaces `background=random` (inconsistent) with a deterministic,
 * role-based background color for a consistent look.
 * Also ensures users with null avatar get a generated one.
 */
class AvatarFixSeeder extends Seeder
{
    // Deterministic role-to-color mapping
    private array $roleColors = [
        'super_admin'   => '6366f1', // indigo
        'admin'         => '3b82f6', // blue
        'accounting'    => '10b981', // emerald
        'human_resource'=> 'f59e0b', // amber
        'agent'         => '8b5cf6', // violet
        'driver'        => 'ef4444', // red
        'mechanic'      => 'f97316', // orange
    ];

    public function run(): void
    {
        $users = User::all();

        foreach ($users as $user) {
            // Skip users who have uploaded a real avatar (stored locally)
            if ($user->avatar_url && str_starts_with($user->avatar_url, '/storage')) {
                continue;
            }

            $color = $this->roleColors[$user->role] ?? '64748b'; // slate fallback
            $name  = urlencode($user->first_name . ' ' . $user->last_name);
            $avatarUrl = "https://ui-avatars.com/api/?name={$name}&background={$color}&color=fff&size=256&bold=true";

            $user->update(['avatar_url' => $avatarUrl]);
            $this->command->info("✓ Avatar fixed for: {$user->first_name} {$user->last_name} ({$user->role})");
        }
    }
}
