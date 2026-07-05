<?php

namespace Tests\Feature;

use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Roadmap 2.1 — guards that outbound mail and notifications are queued, so they never
 * block the HTTP request. The docker-compose `worker` service (php artisan queue:work
 * redis) processes them. If someone drops ShouldQueue from any of these, this fails.
 */
class QueuedDispatchTest extends TestCase
{
    public static function mailables(): array
    {
        return array_map(fn ($c) => ["App\\Mail\\{$c}"], [
            'BookingConfirmationMail',
            'ContractSentForSignatureMail',
            'CustomerOutreachMail',
            'DocumentsCompleteMail',
            'KycRequestMail',
            'TransactionNotificationMail',
            'VisaDocumentRequestMail',
        ]);
    }

    public static function notifications(): array
    {
        return array_map(fn ($c) => ["App\\Notifications\\{$c}"], [
            'AccountInvitation',
            'ActionableApprovalNotification',
            'SystemAlert',
            'TempPasswordNotification',
        ]);
    }

    #[DataProvider('mailables')]
    public function test_mailable_is_queued(string $class): void
    {
        $this->assertContains(ShouldQueue::class, class_implements($class), "{$class} must implement ShouldQueue.");
    }

    #[DataProvider('notifications')]
    public function test_notification_is_queued(string $class): void
    {
        $this->assertContains(ShouldQueue::class, class_implements($class), "{$class} must implement ShouldQueue.");
    }
}
