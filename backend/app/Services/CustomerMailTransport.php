<?php

namespace App\Services;

use RuntimeException;

class CustomerMailTransport
{
    public function mailerName(): string
    {
        $name = (string) config('mail.transactional_mailer', 'smtp');
        if (! app()->environment('testing') && ! $this->deliversExternally($name)) {
            throw new RuntimeException('Customer email transport is not configured for external delivery. Set MAIL_TRANSACTIONAL_MAILER to a real mail provider.');
        }

        return $name;
    }

    private function deliversExternally(string $name): bool
    {
        $mailer = config("mail.mailers.{$name}");
        if (! is_array($mailer)) {
            return false;
        }

        $transport = $mailer['transport'] ?? null;
        if (in_array($transport, ['smtp', 'sendmail', 'ses', 'ses-v2', 'postmark', 'resend'], true)) {
            return true;
        }
        if (in_array($transport, ['failover', 'roundrobin'], true)) {
            $members = $mailer['mailers'] ?? [];

            return is_array($members) && $members !== []
                && collect($members)->every(fn ($member) => is_string($member) && $member !== $name && $this->deliversExternally($member));
        }

        return false;
    }
}
