<?php

namespace App\Http\Services;

use App\Models\User;
use App\Notifications\SystemAlert;
use App\Notifications\ActionableApprovalNotification;
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
        $admins = User::whereIn('role', ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'])->get();
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
        $creatorName = $po->creator ? ($po->creator->first_name . ' ' . $po->creator->last_name) : 'An agent';
        $recipients = User::whereIn('role', ['super_admin', 'executive_vice_president', 'purchasing_manager', 'accounting_executive'])->get();

        $details = [
            'P.O. Number' => $po->po_number,
            'Supplier'    => $po->supplier->name ?? 'N/A',
            'Grand Total' => '$' . number_format($po->grand_total, 2),
            'Created By'  => $creatorName,
            'Item Count'  => $po->lineItems->count() . ' items',
            'Line Items'  => $po->lineItems->map(fn($item) => $item->item_name . ' (' . $item->quantity . ' ' . ($item->unit_of_measure ?? 'pcs') . ' @ $' . number_format($item->unit_price, 2) . ')')->join("\n"),
        ];

        foreach ($recipients as $recipient) {
            $recipient->notify(new ActionableApprovalNotification(
                "PO Submitted: " . $po->po_number,
                "$creatorName has submitted a new Purchase Order of amount $" . number_format($po->grand_total, 2) . " for your verification and approval.",
                'purchase_order',
                $po->id,
                $details
            ));
        }
    }

    /**
     * Notify agent/accounting of PO verification or approval status updates.
     */
    public static function notifyPoStatusUpdate(PurchaseOrder $po, string $status)
    {
        // 1. Send secure actionable approval links to CEO when verified by accounting
        if ($status === 'pending_ceo_approval') {
            $ceos = User::whereIn('role', ['super_admin', 'executive_vice_president'])->get();
            $details = [
                'P.O. Number'  => $po->po_number,
                'Supplier'     => $po->supplier->name ?? 'N/A',
                'Grand Total'  => '$' . number_format($po->grand_total, 2),
                'Verified By'  => $po->verifier ? ($po->verifier->first_name . ' ' . $po->verifier->last_name) : 'Accounting',
                'Item Count'   => $po->lineItems->count() . ' items',
                'Line Items'   => $po->lineItems->map(fn($item) => $item->item_name . ' (' . $item->quantity . ' ' . ($item->unit_of_measure ?? 'pcs') . ' @ $' . number_format($item->unit_price, 2) . ')')->join("\n"),
            ];

            foreach ($ceos as $ceo) {
                $ceo->notify(new ActionableApprovalNotification(
                    "PO Pending CEO Approval: " . $po->po_number,
                    "A Purchase Order of amount $" . number_format($po->grand_total, 2) . " has been verified by Accounting and is pending your final approval.",
                    'purchase_order',
                    $po->id,
                    $details
                ));
            }
        }

        // 2. Alert the original requesting agent of final status update
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
        $approvers = User::whereIn('role', ['super_admin', 'executive_vice_president', 'service_adviser', 'head_mechanic'])->get();
        
        $details = [
            'W.O. Number' => $wo->wo_number,
            'Bus Fleet'   => $wo->bus->plate_number ?? 'N/A',
            'Odometer'    => number_format($wo->odometer ?? 0) . ' km',
            'Priority'    => strtoupper($wo->priority),
            'Description' => $wo->description ?? 'N/A',
            'Created By'  => $wo->creator ? ($wo->creator->first_name . ' ' . $wo->creator->last_name) : 'Fleet System',
        ];

        foreach ($approvers as $approver) {
            $approver->notify(new ActionableApprovalNotification(
                "Work Order Pending Approval: " . $wo->wo_number,
                "A new maintenance Work Order has been generated for Bus Plate " . ($wo->bus->plate_number ?? 'N/A') . " and is pending approval.",
                'work_order',
                $wo->id,
                $details
            ));
        }
    }

    /**
     * Notify Service Adviser of a verified Work Order pending final filing.
     */
    public static function notifyWorkOrderVerification(WorkOrder $wo)
    {
        $serviceAdvisers = User::whereIn('role', ['super_admin', 'executive_vice_president', 'service_adviser'])->get();
        
        $details = [
            'W.O. Number' => $wo->wo_number,
            'Bus Fleet'   => $wo->bus->plate_number ?? 'N/A',
            'Odometer'    => number_format($wo->odometer ?? 0) . ' km',
            'Priority'    => strtoupper($wo->priority),
            'Description' => $wo->description ?? 'N/A',
            'Verified By' => $wo->verifier ? ($wo->verifier->first_name . ' ' . $wo->verifier->last_name) : 'Head Mechanic',
        ];

        foreach ($serviceAdvisers as $adviser) {
            $adviser->notify(new ActionableApprovalNotification(
                "Work Order Verified: " . $wo->wo_number,
                "A maintenance Work Order has been verified by the Head Mechanic and is pending your final filing and approval.",
                'work_order',
                $wo->id,
                $details
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

    /**
     * Notify Accounting that a new Cash Budget Request has been auto-generated.
     */
    public static function notifyCashBudgetSpawn(\App\Models\CashBudgetRequest $budget)
    {
        $accountingStaff = User::whereIn('role', ['super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager'])->get();
        
        $message = "A new Cash Budget Request of amount ₱" . number_format($budget->total_amount, 2) . " has been auto-generated for destination: " . ($budget->destination ?? 'N/A') . ". Ready for review.";

        foreach ($accountingStaff as $staff) {
            $staff->notify(new SystemAlert(
                "New Cash Budget Generated",
                $message,
                "info",
                "/operations/commissions",
                "cash_budget_request",
                $budget->id
            ));
        }
    }

    /**
     * Notify Logistics officers that the pre-trip safety inspection is completed and cleared.
     */
    public static function notifyPreTripCleared(\App\Models\TripTicket $ticket)
    {
        $logisticsStaff = User::whereIn('role', ['super_admin', 'executive_vice_president', 'logistics_in_charge', 'dispatcher'])->get();
        
        $message = "Pre-trip safety inspection for Trip Ticket #" . $ticket->control_no . " (Plate: " . ($ticket->bus?->plate_number ?? $ticket->plate_no ?? 'TBA') . ") is fully completed and cleared for travel.";

        foreach ($logisticsStaff as $staff) {
            $staff->notify(new SystemAlert(
                "Pre-trip Safety Cleared",
                $message,
                "success",
                "/logistics/trip-tickets",
                "trip_ticket",
                $ticket->id
            ));
        }
    }

    /**
     * Notify visa agent that the customer has uploaded required documents.
     */
    public static function notifyCustomerDocumentUpload($passportCase, $docTitle)
    {
        $handler = User::find($passportCase->handled_by);
        if ($handler) {
            $customerName = $passportCase->customer ? ($passportCase->customer->first_name . ' ' . $passportCase->customer->last_name) : 'A customer';
            $handler->notify(new SystemAlert(
                "Customer Uploaded Document",
                "Customer {$customerName} has uploaded a document for '{$docTitle}' in Visa Case #{$passportCase->id}.",
                "success",
                "/travel/visa-processing",
                "passport_case",
                $passportCase->id
            ));
        }
    }
}
