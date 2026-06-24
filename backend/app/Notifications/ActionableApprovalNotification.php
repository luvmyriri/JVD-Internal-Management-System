<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class ActionableApprovalNotification extends Notification
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

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // 1. Determine targeted approval action based on role
        $approveAction = 'approve';
        if ($this->modelType === 'purchase_order' && $notifiable->role === 'accounting_executive') {
            $approveAction = 'verify';
        }
        if ($this->modelType === 'cash_budget' && $notifiable->role === 'accounting_executive') {
            $approveAction = 'approve';
        }

        // 2. Generate cryptographically signed URLs (valid for 3 days)
        $approveUrl = URL::temporarySignedRoute(
            'public.action-request',
            now()->addDays(3),
            [
                'model_type' => $this->modelType,
                'model_id'   => $this->modelId,
                'action'     => $approveAction,
                'user_id'    => $notifiable->id,
            ]
        );

        $rejectUrl = URL::temporarySignedRoute(
            'public.action-request',
            now()->addDays(3),
            [
                'model_type' => $this->modelType,
                'model_id'   => $this->modelId,
                'action'     => 'reject',
                'user_id'    => $notifiable->id,
            ]
        );

        $actionLabel = $approveAction === 'verify' ? 'Verify Request' : 'Approve Request';

        return (new MailMessage)
            ->subject($this->title)
            ->view('emails.actionable_approval', [
                'title'       => $this->title,
                'summary'     => $this->summary,
                'details'     => $this->details,
                'approveUrl'  => $approveUrl,
                'rejectUrl'   => $rejectUrl,
                'actionLabel' => $actionLabel,
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
            'link' => match ($this->modelType) {
                'purchase_order' => '/procurement/purchase-orders',
                'cash_budget' => '/operations/cash-budgets',
                default => '/fleet/maintenance',
            },
            'model_type' => $this->modelType,
            'model_id' => $this->modelId,
        ];
    }
}
