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
    private array $roleColors = [
        'super_admin'              => 'f43f5e', // rose
        'executive_vice_president' => 'f43f5e', // rose
        'operations_manager'       => '06b6d4', // cyan
        'reservation_officer'      => 'f97316', // orange
        'office_staff'             => 'eab308', // yellow
        'accounting_executive'     => '14b8a6', // teal
        'corporate_secretary'      => 'ec4899', // pink
        'logistics_in_charge'      => '84cc16', // lime
        'dispatcher'               => 'd946ef', // fuchsia
        'purchasing_manager'       => '0ea5e9', // sky
        'service_adviser'          => '78716c', // stone
        'head_mechanic'            => '737373', // neutral/slate
        'driver'                   => '6366f1', // indigo
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
