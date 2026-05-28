<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WorkOrder;
use App\Models\PurchaseOrder;
use App\Models\InventoryItem;
use App\Http\Services\AuditLogService;
use App\Http\Services\NotificationService;
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
     * Handle Work Order Approval / Rejection
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

        // Check if already processed
        if ($workOrder->status !== 'pending_approval') {
            return view('action_result', [
                'status'  => 'warning',
                'title'   => 'Already Processed',
                'message' => "This Work Order has already been processed by another officer. No further remote action is needed.",
                'details' => [
                    'Work Order #' => $workOrder->wo_number,
                    'Current Status' => strtoupper($workOrder->status),
                    'Assigned To' => $workOrder->assignee ? ($workOrder->assignee->first_name . ' ' . $workOrder->assignee->last_name) : 'Unassigned',
                ]
            ]);
        }

        try {
            DB::beginTransaction();

            if ($action === 'approve') {
                $workOrder->update([
                    'status'         => 'open',
                    'approved_by'    => $actor->id,
                    'approved_at'    => now(),
                    'approval_notes' => 'Approved remotely via secure email link.',
                ]);

                // Create log entry if service available
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
                    'title'   => 'Work Order Approved',
                    'message' => 'The Work Order has been successfully approved. The maintenance team has been authorized to begin operations.',
                    'details' => [
                        'Work Order #' => $workOrder->wo_number,
                        'Bus Fleet' => $workOrder->bus->plate_number ?? 'N/A',
                        'Approved By' => $actor->first_name . ' ' . $actor->last_name,
                        'Timestamp' => now()->format('Y-m-d H:i:s'),
                    ]
                ]);
            } elseif ($action === 'reject') {
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
            }
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return view('action_result', [
            'status'  => 'error',
            'title'   => 'Execution Error',
            'message' => 'An unexpected database error occurred while updating the Work Order.',
            'details' => [
                'Error Details' => $e->getMessage()
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
                        'Grand Total' => '$' . number_format($purchaseOrder->grand_total, 2),
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
                        'Total Sum' => '$' . number_format($purchaseOrder->grand_total, 2),
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
                        'Total Sum' => '$' . number_format($purchaseOrder->grand_total, 2),
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
}
