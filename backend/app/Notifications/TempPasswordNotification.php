<?php
/**
 * TempPasswordNotification
 * Sent to new employees when a temporary password is generated.
 * The employee uses this password to log in, then is forced to change it.
 */

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TempPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $tempPassword;

    public function __construct(string $tempPassword)
    {
        $this->tempPassword = $tempPassword;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'JVD Management System');

        return (new MailMessage)
            ->subject('Your ' . $appName . ' Account Credentials')
            ->greeting('Hello ' . ($notifiable->first_name ?? 'Employee') . '!')
            ->line('Your account has been created on the ' . $appName . '.')
            ->line('Use the temporary password below to log in:')
            ->line('**Temporary Password: `' . $this->tempPassword . '`**')
            ->line('> **Important:** You will be required to change your password immediately after your first login for security reasons.')
            ->line('Please keep this password confidential and do not share it with anyone.')
            ->line('If you did not expect this email, please contact your system administrator immediately.')
            ->salutation('— ' . $appName . ' Security Team');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'temp_password',
        ];
    }
}
