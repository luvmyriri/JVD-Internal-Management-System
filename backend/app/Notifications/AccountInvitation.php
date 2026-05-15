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

class AccountInvitation extends Notification
{
    use Queueable;

    public $token;
    public $email;

    /**
     * Create a new notification instance.
     */
    public function __construct($token, $email)
    {
        $this->token = $token;
        $this->email = $email;
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
        $frontendUrls = explode(',', env('FRONTEND_URL', 'http://localhost:3000'));
        $baseUrl = $frontendUrls[0];
        
        $url = rtrim($baseUrl, '/') . '/set-password?token=' . $this->token . '&email=' . urlencode($this->email);

        return (new MailMessage)
            ->subject('Welcome to ' . config('app.name'))
            ->greeting('Hello ' . ($notifiable->first_name ?? 'Employee') . '!')
            ->line('Your account has been created on the ' . config('app.name') . '.')
            ->line('To get started and access your dashboard, you need to set up your account password.')
            ->action('Set Account Password', $url)
            ->line('For security reasons, this link will expire in 60 minutes.')
            ->line('If you did not expect this invitation, please ignore this email.')
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
            'type' => 'account_invitation',
            'email' => $this->email,
        ];
    }
}
