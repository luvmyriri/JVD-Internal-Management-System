<?php
/**
 * AccountInvitation Notification
 * Sent to new employees to set their password.
 */

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    public $token;
    public $email;
    public bool $isPasswordReset;

    /**
     * Create a new notification instance.
     */
    public function __construct($token, $email, bool $isPasswordReset = false)
    {
        $this->afterCommit();
        $this->token = $token;
        $this->email = $email;
        $this->isPasswordReset = $isPasswordReset;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $baseUrl = (string) config('app.frontend_url');

        $url = rtrim($baseUrl, '/') . '/set-password?token=' . $this->token . '&email=' . urlencode($this->email);

        $mail = (new MailMessage)
            ->subject(($this->isPasswordReset ? 'Reset your password for ' : 'Welcome to ') . config('app.name'))
            ->greeting('Hello ' . ($notifiable->first_name ?? 'Employee') . '!');

        if ($this->isPasswordReset) {
            $mail
                ->line('An administrator requested a secure password reset for your account.')
                ->line('Your previous password can no longer be used. Use the link below to choose a new one.')
                ->action('Set New Password', $url)
                ->line('If you did not expect this reset, contact your system administrator immediately.');
        } else {
            $mail
                ->line('Your account has been created on the ' . config('app.name') . '.')
                ->line('To get started and access your dashboard, set up your account password.')
                ->action('Set Account Password', $url)
                ->line('If you did not expect this invitation, please ignore this email.');
        }

        return $mail
            ->line('For security reasons, this link will expire in 60 minutes.')
            ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->isPasswordReset ? 'password_reset' : 'account_invitation',
            'email' => $this->email,
        ];
    }
}
