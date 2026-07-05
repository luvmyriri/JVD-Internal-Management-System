<?php

namespace App\Http\Controllers\Workflow;

use App\Http\Controllers\Controller;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalsController extends Controller
{
    protected $workflowService;

    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    /**
     * Get all pending workflow instances that the current user can act on.
     */
    public function inbox(Request $request): JsonResponse
    {
        $instances = $this->workflowService->whoCanActNow($request->user());

        // Transform instances for the inbox view
        $inboxItems = $instances->map(function ($instance) {
            $subject = $instance->subject;
            $moduleName = $instance->definition->name;
            $reference = null;
            $amount = null;

            if ($subject instanceof \App\Models\CashBudgetRequest) {
                $reference = 'CB-' . $subject->id;
                $amount = $subject->total_amount;
            } elseif ($subject instanceof \App\Models\PurchaseOrder) {
                $reference = 'PO-' . $subject->po_number;
                $amount = $subject->total_amount;
            }

            return [
                'id' => $instance->id,
                'module' => $moduleName,
                'reference' => $reference,
                'amount' => $amount,
                'current_step' => $instance->current_step,
                'status' => $instance->status,
                'created_at' => $instance->created_at,
                'subject_id' => $instance->subject_id,
                'subject_type' => $instance->subject_type,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $inboxItems,
        ]);
    }
}
