<?php

namespace App\Services;

use App\Models\WorkOrder;
use Illuminate\Support\Facades\DB;

class WorkOrderService
{
    /**
     * Create a new Work Order manually.
     */
    public function create(array $data, int $userId): WorkOrder
    {
        return DB::transaction(function () use ($data, $userId) {
            $user = \App\Models\User::find($userId);
            
            $status = 'pending_validation';
            $isOverride = !empty($data['is_override']);
            
            if ($isOverride && $user && $user->hasRole('super_admin', 'executive_vice_president', 'service_adviser', 'dispatcher', 'logistics_in_charge')) {
                $status = 'open';
            } elseif ($user && $user->hasRole('head_mechanic')) {
                $status = 'pending_approval';
            }

            $wo = WorkOrder::create([
                'wo_number'     => $this->generateWONumber(),
                'bus_id'        => $data['bus_id'],
                'assigned_to'   => $data['assigned_to'] ?? null,
                'created_by'    => $userId,
                'status'        => $status,
                'type'          => $data['type'] ?? 'maintenance',
                'priority'      => $data['priority'],
                'description'   => $data['description'],
                'parts_used'    => $data['parts_used'] ?? null,
                'cost'          => $data['cost'] ?? 0,
                'auto_generated'=> false,
            ]);

            if (in_array($wo->status, ['pending_validation', 'pending_approval'])) {
                \App\Services\NotificationService::notifyWorkOrderRequest($wo);
            }

            return $wo;
        });
    }

    /**
     * Update Work Order status with a state machine guard.
     * Valid transitions: open → in_progress → completed | cancelled
     */
    public function updateStatus(WorkOrder $wo, string $newStatus): WorkOrder
    {
        $validTransitions = [
            'open'        => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
        ];

        $current = $wo->status;

        if (!isset($validTransitions[$current]) || !in_array($newStatus, $validTransitions[$current])) {
            throw new \InvalidArgumentException(
                "Cannot transition Work Order from '{$current}' to '{$newStatus}'."
            );
        }

        $wo->update(['status' => $newStatus]);
        return $wo->fresh();
    }

    /**
     * Generate auto-incrementing WO number: WO-2026-0001
     */
    private function generateWONumber(): string
    {
        $year = now()->year;
        // H-03: lock the latest row so concurrent create() transactions cannot read the same sequence.
        $latest = WorkOrder::withTrashed()
            ->where('wo_number', 'like', "WO-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->wo_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('WO-%d-%04d', $year, $sequence);
    }
}
