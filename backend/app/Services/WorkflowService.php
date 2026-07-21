<?php

namespace App\Services;

use App\Models\User;
use App\Models\WorkflowAction;
use App\Models\WorkflowDefinition;
use App\Models\WorkflowInstance;
use App\Models\WorkflowStep;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WorkflowService
{
    /**
     * Submit an entity to a workflow.
     */
    public function submit(Model $subject, string $module): WorkflowInstance
    {
        return DB::transaction(function () use ($subject, $module) {
            $definition = WorkflowDefinition::where('module', $module)->where('active', true)->firstOrFail();

            // Find step 1
            $firstStep = $definition->steps()->where('order', 1)->firstOrFail();

            $instance = WorkflowInstance::create([
                'definition_id' => $definition->id,
                'subject_type' => get_class($subject),
                'subject_id' => $subject->getKey(),
                'current_step' => $firstStep->order,
                'status' => 'pending',
            ]);

            // Sync the model's status if it has one
            if (in_array('status', $subject->getFillable()) || property_exists($subject, 'status')) {
                // If it's a cash budget, the first step might be "pending_accounting"
                // Let's just say "pending" generally, we can customize per module or let the model handle it.
                // Or map step orders to old statuses for transition.
            }

            return $instance;
        });
    }

    /**
     * Approve the current step.
     */
    public function approve(WorkflowInstance $instance, User $user, string $comment = null): WorkflowInstance
    {
        return DB::transaction(function () use ($instance, $user, $comment) {
            if ($instance->status !== 'pending') {
                throw new \Exception("Instance is not pending.");
            }

            $currentStep = $instance->definition->steps()->where('order', $instance->current_step)->firstOrFail();

            if (!$this->canAct($currentStep, $user, $instance->subject)) {
                throw new \Exception("User is not authorized to act on this step.");
            }

            // Record action
            WorkflowAction::create([
                'instance_id' => $instance->id,
                'step' => $instance->current_step,
                'user_id' => $user->id,
                'decision' => 'approved',
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            // Find next step
            $nextStep = $instance->definition->steps()
                ->where('order', '>', $instance->current_step)
                ->orderBy('order', 'asc')
                ->first();

            if ($nextStep) {
                // Move to next step
                $instance->update([
                    'current_step' => $nextStep->order,
                ]);
            } else {
                // Completed
                $instance->update([
                    'status' => 'completed',
                ]);
            }

            return $instance->fresh();
        });
    }

    /**
     * Reject the workflow.
     */
    public function reject(WorkflowInstance $instance, User $user, string $comment): WorkflowInstance
    {
        return DB::transaction(function () use ($instance, $user, $comment) {
            if ($instance->status !== 'pending') {
                throw new \Exception("Instance is not pending.");
            }

            $currentStep = $instance->definition->steps()->where('order', $instance->current_step)->firstOrFail();

            if (!$this->canAct($currentStep, $user, $instance->subject)) {
                throw new \Exception("User is not authorized to act on this step.");
            }

            // Record action
            WorkflowAction::create([
                'instance_id' => $instance->id,
                'step' => $instance->current_step,
                'user_id' => $user->id,
                'decision' => 'rejected',
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            $instance->update([
                'status' => 'rejected',
            ]);

            return $instance->fresh();
        });
    }

    /**
     * Determine if user can act on a specific step
     */
    protected function canAct(WorkflowStep $step, User $user, Model $subject = null): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($step->approver_type === 'permission') {
            // approver_value is e.g. "cash_budgets:approve_accounting"
            if (str_contains($step->approver_value, ':')) {
                [$module, $action] = explode(':', $step->approver_value, 2);

                // Named ability (roadmap 2.3) — the abilities system backs verbs beyond CRUD,
                // e.g. "cash_budgets:approve_accounting".
                if ($user->hasAbility("{$module}.{$action}")) {
                    return true;
                }

                $actionKey = 'can_' . $action;
                $perms = $user->getAllPermissions();
                if (isset($perms[$module][$actionKey]) && $perms[$module][$actionKey] === true) {
                    return true;
                }

                // fallback to general hasPermission if named ability is standard
                return $user->hasPermission($module, $action);
            }
        }

        if ($step->approver_type === 'role') {
            return $user->hasRole($step->approver_value);
        }

        if ($step->approver_type === 'user') {
            return $user->id == $step->approver_value;
        }

        return false;
    }

    /**
     * Get instances awaiting the user's action
     */
    public function whoCanActNow(User $user)
    {
        // For super admin, they can act on any pending
        if ($user->role === 'super_admin') {
            return WorkflowInstance::with(['subject', 'definition'])->where('status', 'pending')->get();
        }

        // For regular users, we must find steps they are authorized for
        $allPending = WorkflowInstance::with(['subject', 'definition.steps'])->where('status', 'pending')->get();
        $awaiting = [];

        foreach ($allPending as $instance) {
            $currentStep = $instance->definition->steps->firstWhere('order', $instance->current_step);
            if ($currentStep && $this->canAct($currentStep, $user, $instance->subject)) {
                $awaiting[] = $instance;
            }
        }

        return collect($awaiting);
    }
}
