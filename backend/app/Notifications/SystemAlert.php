<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SystemAlert extends Notification
{
    use Queueable;

    protected $title;
    protected $message;
    protected $type;
    protected $link;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $title, string $message, string $type = 'info', ?string $link = null)
    {
        $this->title = $title;
        $this->message = $message;
        $this->type = $type;
        $this->link = $link;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \Illuminate\Notifications\Messages\MailMessage
    {
        $message = (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject($this->title)
            ->greeting("Hello " . ($notifiable->first_name ?? 'User') . ",")
            ->line($this->message);

        if ($this->link) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $urls = explode(',', $frontendUrl);
            $baseUrl = $urls[0] ?? 'http://localhost:3000';

            $fullUrl = str_starts_with($this->link, 'http')
                ? $this->link
                : rtrim($baseUrl, '/') . '/' . ltrim($this->link, '/');

            $message->action('View Details', $fullUrl);
        }

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'link' => $this->link,
        ];
    }
}
