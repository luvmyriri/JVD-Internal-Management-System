<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SystemAlert extends Notification implements ShouldQueue
{
    use Queueable;

    protected $title;
    protected $message;
    protected $type;
    protected $link;
    protected $modelType;
    protected $modelId;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        ?string $modelType = null,
        ?int $modelId = null
    ) {
        $this->title     = $title;
        $this->message   = $message;
        $this->type      = $type;
        $this->link      = $link;
        $this->modelType = $modelType;
        $this->modelId   = $modelId;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** Notification category for per-user preference gating (roadmap 2.6). */
    public function category(): string
    {
        return 'system';
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title'      => $this->title,
            'message'    => $this->message,
            'type'       => $this->type,
            'link'       => $this->link,
            'model_type' => $this->modelType,
            'model_id'   => $this->modelId,
        ];
    }
}
