<?php

namespace App\Http\Services;

use App\Models\User;
use App\Notifications\SystemAlert;
use App\Models\Accreditation;
use App\Models\PurchaseOrder;
use App\Models\WorkOrder;
use App\Models\AgentTask;

/**
 * Handles in-app alerts and email notifications.
 * Integrates with Laravel Notifications database system.
 */
class NotificationService
{
    /**
     * Notify administrators/accounting about a new KYC submission.
     */
    public static function notifyKycSubmission(Accreditation $accreditation)
    {
        $admins = User::whereIn('role', ['super_admin', 'admin', 'accounting'])->get();
        foreach ($admins as $admin) {
            $admin->notify(new SystemAlert(
                "KYC Submitted: " . $accreditation->entity_name,
                "Supplier " . $accreditation->entity_name . " has successfully submitted KYC documents.",
                "success",
                "/procurement/accreditations"
            ));
        }
    }

    /**
     * Notify admins/accounting that a Purchase Order has been submitted for verification.
     */
    public static function notifyPoSubmission(PurchaseOrder $po)
    {
        $admins = User::whereIn('role', ['super_admin', 'admin', 'accounting'])->get();
        $creatorName = $po->creator ? ($po->creator->first_name . ' ' . $po->creator->last_name) : 'An agent';
        foreach ($admins as $admin) {
            $admin->notify(new SystemAlert(
                "PO Submitted: " . $po->po_number,
                $creatorName . " submitted a PO of amount $" . number_format($po->grand_total, 2) . " for verification.",
                "warning",
                "/procurement/purchase-orders"
            ));
        }
    }

    /**
     * Notify agent/accounting of PO verification or approval status updates.
     */
    public static function notifyPoStatusUpdate(PurchaseOrder $po, string $status)
    {
        $creator = User::find($po->created_by);
        if ($creator) {
            $type = 'info';
            $message = "Your purchase order has been marked as " . strtolower(str_replace('_', ' ', $status)) . ".";
            
            if ($status === 'approved') {
                $type = 'success';
                $message = "Your purchase order has been approved by CEO!";
            } elseif ($status === 'rejected') {
                $type = 'error';
                $message = "Your purchase order was rejected. Notes: " . ($po->rejection_notes ?? 'No reason provided.');
            } elseif ($status === 'pending_ceo_approval') {
                $type = 'info';
                $message = "Your purchase order has been verified by accounting and is pending CEO approval.";
            }

            $creator->notify(new SystemAlert(
                "PO Status: " . $po->po_number,
                $message,
                $type,
                "/procurement/purchase-orders"
            ));
        }
    }

    /**
     * Notify designated approvers of an auto-generated/requested Work Order.
     */
    public static function notifyWorkOrderRequest(WorkOrder $wo)
    {
        $approvers = User::whereIn('role', ['super_admin', 'admin'])->get();
        foreach ($approvers as $approver) {
            $approver->notify(new SystemAlert(
                "Work Order: " . $wo->wo_number,
                "A maintenance work order is pending approval. Bus: " . ($wo->bus->plate_number ?? 'N/A'),
                "warning",
                "/fleet/maintenance"
            ));
        }
    }

    /**
     * Notify travel agent that they have been assigned a task.
     */
    public static function notifyTaskAssignment(AgentTask $task)
    {
        $assignee = User::find($task->assigned_to);
        if ($assignee) {
            $assignee->notify(new SystemAlert(
                "Task Assigned",
                "You have been assigned: " . $task->title,
                "warning",
                "/travel/passporting"
            ));
        }
    }
}
