<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetAllPasswords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:reset-all-passwords {--password=password123 : The password to set for all accounts} {--force-change : Require users to change password on first login}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset all user passwords in the database to a specified password (default: password123)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $newPassword = $this->option('password');
        $forceChange = (bool) $this->option('force-change');
        $hashed = Hash::make($newPassword);

        $count = User::query()->update([
            'password' => $hashed,
            'must_change_password' => $forceChange,
        ]);

        $statusMsg = $forceChange ? ' (with mandatory password change on next login)' : '';
        $this->info("✓ Successfully reset passwords for all {$count} user account(s) to '{$newPassword}'{$statusMsg}.");

        return Command::SUCCESS;
    }
}
