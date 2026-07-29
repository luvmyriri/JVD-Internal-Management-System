<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTestEmail extends Command
{
    protected $signature = 'mail:test {email : Recipient email address}';
    protected $description = 'Send a test email to verify SMTP configuration on VPS';

    public function handle(): int
    {
        $recipient = $this->argument('email');
        $mailer = config('mail.default');
        $host = config('mail.mailers.smtp.host');
        $port = config('mail.mailers.smtp.port');
        $from = config('mail.from.address');

        $this->info("Attempting to send test email to: {$recipient}");
        $this->line("Mailer Driver: {$mailer}");
        $this->line("SMTP Host: {$host}:{$port}");
        $this->line("From Address: {$from}");

        if ($mailer === 'log') {
            $this->warn("WARNING: MAIL_MAILER is set to 'log'. The email will be written to storage/logs/laravel.log instead of sending over the network!");
        }

        try {
            Mail::raw("Hello!\n\nThis is a test email from your JVD Management System running on VPS.\nIf you received this message, your SMTP email delivery is configured correctly!\n\nTimestamp: " . now()->toDateTimeString(), function ($message) use ($recipient) {
                $message->to($recipient)
                    ->subject('JVD Management System — SMTP Test Email');
            });

            $this->info("SUCCESS: Test email sent successfully to {$recipient}!");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("FAILED: Could not send email via {$mailer}.");
            $this->error("Error Message: " . $e->getMessage());
            return self::FAILURE;
        }
    }
}
