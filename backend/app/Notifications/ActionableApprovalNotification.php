<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ActionableApprovalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $title;
    protected $summary;
    protected $modelType;
    protected $modelId;
    protected $details;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $title, string $summary, string $modelType, int $modelId, array $details)
    {
        $this->afterCommit();
        $this->title = $title;
        $this->summary = $summary;
        $this->modelType = $modelType;
        $this->modelId = $modelId;
        $this->details = $details;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /** Notification category for per-user preference gating (roadmap 2.6). */
    public function category(): string
    {
        return 'approvals';
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $reviewPath = $this->reviewPath();

        $reviewUrl = rtrim((string) config('app.frontend_url'), '/')
            . $reviewPath
            . '?'
            . http_build_query([
                'review_type' => $this->modelType,
                'review_id' => $this->modelId,
            ]);

        return (new MailMessage)
            ->subject($this->title)
            ->view('emails.actionable_approval', [
                'title'       => $this->title,
                'summary'     => $this->summary,
                'details'     => $this->details,
                'reviewUrl'   => $reviewUrl,
                'modelType'   => $this->modelType,
                'userName'    => $notifiable->first_name . ' ' . $notifiable->last_name,
            ]);
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->summary,
            'type' => 'warning',
            'link' => $this->reviewPath() . '?' . http_build_query([
                'review_type' => $this->modelType,
                'review_id' => $this->modelId,
            ]),
            'model_type' => $this->modelType,
            'model_id' => $this->modelId,
        ];
    }

    private function reviewPath(): string
    {
        return match ($this->modelType) {
            'purchase_order' => '/procurement/purchase-orders',
            'cash_budget' => '/accounting/cash-budgets',
            'work_order' => '/procurement/work-orders',
            default => '/dashboard',
        };
    }
}
