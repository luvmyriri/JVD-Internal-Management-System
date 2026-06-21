<?php

namespace App\Http\Services;

use App\Models\Bus;
use App\Models\WorkOrder;

class MaintenanceService
{
    /**
     * Default mileage interval (km) before a bus needs servicing.
     */
    private const MILEAGE_INTERVAL = 5000;

    /**
     * Default time interval (days) before a bus needs servicing.
     */
    private const DAY_INTERVAL = 90;

    /**
     * Check whether a bus has crossed its service threshold.
     * Triggers when either mileage OR time interval is exceeded.
     *
     * @param Bus $bus
     * @return bool
     */
    public function checkThreshold(Bus $bus): bool
    {
        // Mileage-based threshold
        if ($bus->last_service_date) {
            $mileageSinceService = $bus->total_mileage - $this->getMileageAtLastService($bus);
            if ($mileageSinceService >= self::MILEAGE_INTERVAL) {
                return true;
            }
        }

        // Date-based threshold
        if ($bus->next_service_due && now()->gte($bus->next_service_due)) {
            return true;
        }

        return false;
    }

    /**
     * Auto-generate a Work Order when a bus exceeds its maintenance threshold.
     * Returns the created WO or null if one is already open for this bus.
     *
     * @param Bus $bus
     * @return WorkOrder|null
     */
    public function autoGenerateWorkOrder(Bus $bus): ?WorkOrder
    {
        // Avoid duplicate open WOs for the same bus
        $existingOpen = WorkOrder::where('bus_id', $bus->id)
            ->whereIn('status', ['pending_approval', 'open', 'in_progress'])
            ->where('auto_generated', true)
            ->exists();

        if ($existingOpen) {
            return null;
        }

        $wo = WorkOrder::create([
            'wo_number'      => $this->generateWONumber(),
            'bus_id'         => $bus->id,
            'created_by'     => 1, // System-generated fallback to admin
            'assigned_to'    => null,
            'status'         => 'pending_approval',
            'priority'       => 'routine',
            'description'    => "Preventive maintenance due for bus {$bus->plate_number}. "
                              . "Total mileage: {$bus->total_mileage} km.",
            'parts_used'     => null,
            'cost'           => 0,
            'auto_generated' => true,
        ]);

        // Set bus status to under_maintenance
        $bus->update(['status' => 'under_maintenance']);

        \App\Http\Services\NotificationService::notifyWorkOrderRequest($wo);

        return $wo;
    }

    /**
     * Recalculate the next service window after a Work Order is completed.
     * Called by WorkOrderController when a WO transitions to 'completed'.
     *
     * @param Bus $bus
     * @return void
     */
    public function recalculateNextService(Bus $bus): void
    {
        $bus->update([
            'last_service_date' => now()->toDateString(),
            'next_service_due'  => now()->addDays(self::DAY_INTERVAL)->toDateString(),
            'status'            => 'available',
        ]);
    }

    /**
     * Generate a WO number in the WO-YYYY-NNNN format.
     */
    private function generateWONumber(): string
    {
        $year   = now()->year;
        $latest = WorkOrder::withTrashed()
                           ->where('wo_number', 'like', "WO-{$year}-%")
                           ->orderByDesc('id')
                           ->first();

        $sequence = 1;
        if ($latest) {
            $parts    = explode('-', $latest->wo_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('WO-%d-%04d', $year, $sequence);
    }

    /**
     * Estimate mileage at last service based on history (naive approach).
     * Refine with a service_log table in a future sprint.
     */
    private function getMileageAtLastService(Bus $bus): float
    {
        // Fallback: assume the bus had 0 mileage at last service if no log
        return 0;
    }
}

