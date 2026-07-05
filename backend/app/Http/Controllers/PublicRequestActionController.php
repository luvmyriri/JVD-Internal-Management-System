<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WorkOrder;
use App\Models\PurchaseOrder;
use App\Models\CashBudgetRequest;
use App\Models\InventoryItem;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Notifications\SystemAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class PublicRequestActionController extends Controller
{
    /**
     * Handle the incoming secure signed action request.
     */
    public function handle(Request $request): View
    {
        // 1. Verify URL signature integrity
        if (!$request->hasValidSignature()) {
            return view('action_result', [
                'status'  => 'error',
                'title'   => 'Security Verification Failed',
                'message' => 'This remote approval link is either invalid, tampered with, or has expired. Please log into the JVD Management System directly to process this request.',
                'details' => [
                    'Error Code' => 'SEC_URL_INVALID_OR_EXPIRED',
                    'Link Validity' => 'Expired after 72 hours',
                    'Remedy' => 'Request a new email link or approve directly in-app.'
                ]
            ]);
        }

        $modelType = $request->query('model_type');
        $modelId   = (int)$request->query('model_id');
        $action    = $request->query('action');
        $userId    = (int)$request->query('user_id');

        $actor = User::find($userId);
        if (!$actor) {
            return view('action_result', [
                'status'  => 'error',
                'title'   => 'User Authorization Error',
                'message' => 'The designated approver linked to this request could not be identified in the system.',
                'details' => [
                    'Error Code' => 'AUTH_ACTOR_NOT_FOUND',
                    'Action Attempted' => ucfirst($action),
                ]
            ]);
        }

        // 2. Process based on model types
        if ($modelType === 'work_order') {
            return $this->handleWorkOrder($modelId, $action, $actor);
        } elseif ($modelType === 'purchase_order') {
            return $this->handlePurchaseOrder($modelId, $action, $actor);
        } elseif ($modelType === 'cash_budget') {
            return $this->handleCashBudget($modelId, $action, $actor);
        }

        return view('action_result', [
            'status'  => 'error',
            'title'   => 'Unknown Request Type',
            'message' => 'The system encountered an unidentifiable model type request.',
            'details' => [
                'Error Code' => 'UNKNOWN_MODEL_TYPE',
                'Target Model' => $modelType,
            ]
        ]);
    }

    /**
     * Handle Work Order Actions (Verify / Approve / Reject)
     * Supporting multi-stage approvals:
     * - Head Mechanic verifies (pending_approval -> verified)
     * - Service Adviser approves/files (verified -> open)
     */
    private function handleWorkOrder(int $id, string $action, User $actor): View
    {
        $workOrder = WorkOrder::with(['bus', 'assignee'])->find($id);

        if (!$workOrder) {
            return view('action_result', [
                'status'  => 'error',
                'title'   => 'Record Not Found',
                'message' => 'The requested Work Order could not be retrieved from the database.',
                'details' => [
                    'W.O. ID' => '#' . $id,
                ]
            ]);
        }

        // Rejection logic handles both states
        if ($action === 'reject') {
            if (!in_array($workOrder->status, ['pending_approval', 'verified'])) {
                return view('action_result', [
                    'status'  => 'warning',
                    'title'   => 'Finalized Action',
                    'message' => "This Work Order has already been finalized and cannot be rejected.",
                    'details' => [
                        'Work Order #' => $workOrder->wo_number,
                        'Current Status' => strtoupper($workOrder->status),
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $workOrder->update([
                    'status'         => 'cancelled',
                    'approved_by'    => $actor->id,
                    'approved_at'    => now(),
                    'approval_notes' => 'Rejected remotely via secure email link.',
                ]);

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'REJECT_WO',
                        module: 'work-orders',
                        entityType: 'work_order',
                        entityId: $workOrder->id,
                        new: ['status' => 'cancelled', 'approved_by' => $actor->id]
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Work Order Rejected',
                    'message' => 'The Work Order has been declined and cancelled. The fleet management team has been notified.',
                    'details' => [
                        'Work Order #' => $workOrder->wo_number,
                        'Bus Fleet' => $workOrder->bus->plate_number ?? 'N/A',
                        'Rejected By' => $actor->first_name . ' ' . $actor->last_name,
                        'Status' => 'CANCELLED',
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                return view('action_result', [
                    'status'  => 'error',
                    'title'   => 'Execution Error',
                    'message' => 'An unexpected database error occurred while rejecting the Work Order.',
                    'details' => [
                        'Error Details' => $e->getMessage()
                    ]
                ]);
            }
        }

        // Stage 1: Head Mechanic verification
        if ($workOrder->status === 'pending_approval') {
            if ($action !== 'verify' && $action !== 'approve') {
                return view('action_result', [
                    'status'  => 'error',
                    'title'   => 'Invalid Request Action',
                    'message' => 'This action cannot be processed on a pending Work Order.',
                    'details' => [
                        'Action Attempted' => $action,
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $workOrder->update([
                    'status'      => 'verified',
                    'verified_by' => $actor->id,
                    'verified_at' => now(),
                ]);

                // Dispatch notification for Service Adviser approval
                NotificationService::notifyWorkOrderVerification($workOrder);

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'VERIFY_WO',
                        module: 'work-orders',
                        entityType: 'work_order',
                        entityId: $workOrder->id,
                        new: ['status' => 'verified', 'verified_by' => $actor->id]
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Work Order Verified',
                    'message' => 'Work Order verification complete! The request has been successfully passed to the Service Adviser for final filing.',
                    'details' => [
                        'Work Order #' => $workOrder->wo_number,
                        'Bus Fleet' => $workOrder->bus->plate_number ?? 'N/A',
                        'Verified By' => $actor->first_name . ' ' . $actor->last_name,
                        'Target Action' => 'Service Adviser Final Approval',
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                return view('action_result', [
                    'status'  => 'error',
                    'title'   => 'Execution Error',
                    'message' => 'An unexpected database error occurred while verifying the Work Order.',
                    'details' => [
                        'Error Details' => $e->getMessage()
                    ]
                ]);
            }
        }

        // Stage 2: Service Adviser final approval
        if ($workOrder->status === 'verified') {
            if ($action !== 'approve') {
                return view('action_result', [
                    'status'  => 'error',
                    'title'   => 'Invalid Request Action',
                    'message' => 'This action cannot be processed on a verified Work Order.',
                    'details' => [
                        'Action Attempted' => $action,
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $workOrder->update([
                    'status'       => 'open',
                    'approved_by'  => $actor->id,
                    'approved_at'  => now(),
                    'approval_notes' => 'Approved remotely via secure email link.',
                ]);

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'APPROVE_WO',
                        module: 'work-orders',
                        entityType: 'work_order',
                        entityId: $workOrder->id,
                        new: ['status' => 'open', 'approved_by' => $actor->id]
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Work Order Filed & Approved',
                    'message' => 'The Work Order has been successfully filed and approved! The maintenance crew is authorized to begin work.',
                    'details' => [
                        'Work Order #' => $workOrder->wo_number,
                        'Bus Fleet' => $workOrder->bus->plate_number ?? 'N/A',
                        'Approved By' => $actor->first_name . ' ' . $actor->last_name,
                        'Current Status' => 'OPEN',
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                return view('action_result', [
                    'status'  => 'error',
                    'title'   => 'Execution Error',
                    'message' => 'An unexpected database error occurred while approving the Work Order.',
                    'details' => [
                        'Error Details' => $e->getMessage()
                    ]
                ]);
            }
        }

        // Already processed fallback
        return view('action_result', [
            'status'  => 'warning',
            'title'   => 'Already Processed',
            'message' => "This Work Order has already been fully processed. No further action is required.",
            'details' => [
                'Work Order #' => $workOrder->wo_number,
                'Current Status' => strtoupper($workOrder->status),
                'Assigned To' => $workOrder->assignee ? ($workOrder->assignee->first_name . ' ' . $workOrder->assignee->last_name) : 'Unassigned',
            ]
        ]);
    }

    /**
     * Handle Purchase Order Actions (Verify / Approve / Reject)
     */
    private function handlePurchaseOrder(int $id, string $action, User $actor): View
    {
        $purchaseOrder = PurchaseOrder::with(['supplier', 'lineItems', 'creator'])->find($id);

        if (!$purchaseOrder) {
            return view('action_result', [
                'status'  => 'error',
                'title'   => 'Record Not Found',
                'message' => 'The requested Purchase Order could not be retrieved from the database.',
                'details' => [
                    'P.O. ID' => '#' . $id,
                ]
            ]);
        }

        // Verify state validation
        if ($action === 'verify') {
            if ($purchaseOrder->status !== 'pending_accounting_review') {
                return view('action_result', [
                    'status'  => 'warning',
                    'title'   => 'Already Verified',
                    'message' => "This Purchase Order has already been reviewed or verified. No further action is needed.",
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Current Status' => strtoupper($purchaseOrder->status),
                        'Supplier' => $purchaseOrder->supplier->name ?? 'N/A',
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $oldStatus = $purchaseOrder->status;
                $purchaseOrder->update([
                    'status'      => 'pending_ceo_approval',
                    'verified_by' => $actor->id,
                ]);

                // Dispatch notification for CEO approval
                NotificationService::notifyPoStatusUpdate($purchaseOrder, 'pending_ceo_approval');

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'VERIFY_PO',
                        module: 'purchase-orders',
                        entityType: 'purchase_order',
                        entityId: $purchaseOrder->id,
                        old: ['status' => $oldStatus],
                        new: ['status' => 'pending_ceo_approval', 'verified_by' => $actor->id]
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Purchase Order Verified',
                    'message' => 'Accounting verification complete! The P.O. has been successfully verified and forwarded to the CEO for final approval.',
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Grand Total' => '$' . number_format($purchaseOrder->total_amount, 2),
                        'Verified By' => $actor->first_name . ' ' . $actor->last_name,
                        'Supplier' => $purchaseOrder->supplier->name ?? 'N/A',
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        }

        // Approval state validation
        if ($action === 'approve') {
            if ($purchaseOrder->status !== 'pending_ceo_approval') {
                return view('action_result', [
                    'status'  => 'warning',
                    'title'   => 'Already Processed',
                    'message' => "This Purchase Order cannot be approved. It might be already approved, rejected, or still pending accounting verification.",
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Current Status' => strtoupper($purchaseOrder->status),
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $oldStatus = $purchaseOrder->status;
                $purchaseOrder->update([
                    'status'      => 'approved',
                    'approved_by' => $actor->id,
                    'approved_at' => now(),
                ]);

                // Update inventory quantities as standard business logic
                foreach ($purchaseOrder->lineItems as $item) {
                    $inventory = InventoryItem::firstOrCreate(
                        ['item_name' => $item->item_name],
                        [
                            'category' => 'General',
                            'quantity' => 0,
                            'reorder_level' => 10,
                            'unit' => $item->unit_of_measure ?? 'pcs',
                            'unit_cost' => $item->unit_price,
                        ]
                    );
                    
                    $inventory->quantity += $item->quantity;
                    $inventory->unit_cost = $item->unit_price;
                    $inventory->save();
                }

                // Notify creator of approval
                NotificationService::notifyPoStatusUpdate($purchaseOrder, 'approved');

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'APPROVE_PO',
                        module: 'purchase-orders',
                        entityType: 'purchase_order',
                        entityId: $purchaseOrder->id,
                        old: ['status' => $oldStatus],
                        new: ['status' => 'approved', 'approved_by' => $actor->id]
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Purchase Order Approved',
                    'message' => 'The Purchase Order has been successfully approved! Inventory records have been updated to reflect the incoming supplies.',
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Supplier' => $purchaseOrder->supplier->name ?? 'N/A',
                        'Total Sum' => '$' . number_format($purchaseOrder->total_amount, 2),
                        'Approved By' => $actor->first_name . ' ' . $actor->last_name,
                        'Inventory Status' => 'Quantities Credited Successfully',
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        }

        // Rejection state validation
        if ($action === 'reject') {
            if (!in_array($purchaseOrder->status, ['pending_accounting_review', 'pending_ceo_approval'])) {
                return view('action_result', [
                    'status'  => 'warning',
                    'title'   => 'Action Unavailable',
                    'message' => "This Purchase Order has already been finalized and cannot be rejected.",
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Current Status' => strtoupper($purchaseOrder->status),
                    ]
                ]);
            }

            try {
                DB::beginTransaction();

                $oldStatus = $purchaseOrder->status;
                $purchaseOrder->update([
                    'status'          => 'rejected',
                    'rejection_notes' => 'Rejected remotely via secure email link.',
                ]);

                // Notify creator of rejection
                NotificationService::notifyPoStatusUpdate($purchaseOrder, 'rejected');

                if (class_exists(AuditLogService::class)) {
                    AuditLogService::log(
                        action: 'REJECT_PO',
                        module: 'purchase-orders',
                        entityType: 'purchase_order',
                        entityId: $purchaseOrder->id,
                        old: ['status' => $oldStatus],
                        new: ['status' => 'rejected']
                    );
                }

                DB::commit();

                return view('action_result', [
                    'status'  => 'success',
                    'title'   => 'Purchase Order Rejected',
                    'message' => 'The Purchase Order has been successfully rejected. The requesting agent has been notified to modify the document details.',
                    'details' => [
                        'P.O. Number' => $purchaseOrder->po_number,
                        'Supplier' => $purchaseOrder->supplier->name ?? 'N/A',
                        'Total Sum' => '$' . number_format($purchaseOrder->total_amount, 2),
                        'Rejected By' => $actor->first_name . ' ' . $actor->last_name,
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        }

        return view('action_result', [
            'status'  => 'error',
            'title'   => 'Invalid Parameter Combination',
            'message' => 'The specified action state could not be resolved for this Purchase Order.',
            'details' => [
                'Action Requested' => $action,
                'Current Status' => $purchaseOrder->status,
            ]
        ]);
    }

    private function handleCashBudget(int $id, string $action, User $actor): View
    {
        $budget = CashBudgetRequest::with(['preparedBy', 'tripTicket'])->find($id);

        if (!$budget) {
            return view('action_result', [
                'status'  => 'error',
                'title'   => 'Record Not Found',
                'message' => 'The requested Cash Budget could not be retrieved.',
                'details' => ['CB ID' => '#' . $id]
            ]);
        }

        $wfService = app(\App\Services\WorkflowService::class);
        $wfInstance = $budget->workflowInstance ?? tap($wfService->submit($budget, 'cash_budgets'), function ($inst) use ($budget) {
            if ($budget->status === 'pending_super_admin') $inst->update(['current_step' => 2]);
            if ($budget->status === 'approved') $inst->update(['current_step' => 3]);
            if ($budget->status === 'disbursed') $inst->update(['status' => 'completed']);
        });

        if ($action === 'reject') {
            if (!in_array($budget->status, ['pending_accounting', 'pending_super_admin'])) {
                return view('action_result', [
                    'status'  => 'warning',
                    'title'   => 'Already Processed',
                    'message' => 'This Cash Budget has already been finalized.',
                    'details' => [
                        'Reference' => $budget->tripTicket?->control_no ?? 'CB-' . $budget->id,
                        'Current Status' => strtoupper(str_replace('_', ' ', $budget->status)),
                    ]
                ]);
            }

            $wfService->reject($wfInstance, $actor, 'Rejected remotely via secure email link.');
            $budget->update(['status' => 'draft']);

            if ($budget->preparedBy) {
                $budget->preparedBy->notify(new SystemAlert(
                    'Cash Budget Rejected',
                    'Your cash budget request of ₱' . number_format($budget->total_amount, 2) . ' was rejected by ' . $actor->first_name . ' ' . $actor->last_name . '. Please revise and resubmit.',
                    'error',
                    '/operations/cash-budgets',
                    'cash_budget',
                    $budget->id
                ));
            }

            return view('action_result', [
                'status'  => 'success',
                'title'   => 'Cash Budget Rejected',
                'message' => 'The Cash Budget request has been rejected. The preparer has been notified.',
                'details' => [
                    'Reference' => $budget->tripTicket?->control_no ?? 'CB-' . $budget->id,
                    'Amount' => '₱' . number_format($budget->total_amount, 2),
                    'Rejected By' => $actor->first_name . ' ' . $actor->last_name,
                ]
            ]);
        }

        if ($action === 'approve' && $budget->status === 'pending_accounting') {
            $wfService->approve($wfInstance, $actor);
            $budget->update([
                'approved_by' => $actor->id,
                'status'      => 'pending_super_admin',
            ]);

            $saUsers = User::whereIn('role', ['super_admin', 'executive_vice_president'])->where('is_active', true)->get();
            $reference = $budget->tripTicket?->control_no ?? 'CB-' . $budget->id;
            $details = [
                'Reference'   => $reference,
                'Destination' => $budget->destination ?? ($budget->tripTicket?->drop_off ?? 'N/A'),
                'Amount'      => '₱' . number_format($budget->total_amount, 2),
                'Approved By' => $actor->first_name . ' ' . $actor->last_name . ' (Accounting)',
                'Prepared By' => $budget->preparedBy ? ($budget->preparedBy->first_name . ' ' . $budget->preparedBy->last_name) : 'N/A',
            ];

            foreach ($saUsers as $saUser) {
                $saUser->notify(new \App\Notifications\ActionableApprovalNotification(
                    "Cash Budget Pending Final Approval — {$reference}",
                    "A cash budget of ₱" . number_format($budget->total_amount, 2) . " has been verified by accounting and needs your final approval before disbursement.",
                    'cash_budget',
                    $budget->id,
                    $details
                ));
            }

            return view('action_result', [
                'status'  => 'success',
                'title'   => 'Cash Budget Verified by Accounting',
                'message' => 'The Cash Budget has been verified and forwarded to the CEO/EVP for final approval.',
                'details' => $details,
            ]);
        }

        if ($action === 'approve' && $budget->status === 'pending_super_admin') {
            $wfService->approve($wfInstance, $actor);
            $budget->update([
                'super_admin_approved_by' => $actor->id,
                'status' => 'approved',
            ]);

            if ($budget->preparedBy) {
                $budget->preparedBy->notify(new SystemAlert(
                    'Cash Budget Approved for Disbursement',
                    'Your cash budget request of ₱' . number_format($budget->total_amount, 2) . ' has been approved by ' . $actor->first_name . ' ' . $actor->last_name . '. Proceed to disbursement.',
                    'success',
                    '/operations/cash-budgets',
                    'cash_budget',
                    $budget->id
                ));
            }

            return view('action_result', [
                'status'  => 'success',
                'title'   => 'Cash Budget Approved',
                'message' => 'Final approval granted. The budget is now ready for disbursement.',
                'details' => [
                    'Reference' => $budget->tripTicket?->control_no ?? 'CB-' . $budget->id,
                    'Amount' => '₱' . number_format($budget->total_amount, 2),
                    'Approved By' => $actor->first_name . ' ' . $actor->last_name,
                    'Status' => 'READY FOR DISBURSEMENT',
                ]
            ]);
        }

        return view('action_result', [
            'status'  => 'warning',
            'title'   => 'Already Processed',
            'message' => 'This Cash Budget has already been processed at this stage.',
            'details' => [
                'Reference' => $budget->tripTicket?->control_no ?? 'CB-' . $budget->id,
                'Current Status' => strtoupper(str_replace('_', ' ', $budget->status)),
            ]
        ]);
    }
}
