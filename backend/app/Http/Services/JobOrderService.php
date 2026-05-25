<?php

namespace App\Http\Services;

use App\Models\JobOrder;
use App\Models\Passenger;
use Illuminate\Support\Facades\DB;

class JobOrderService
{
    /**
     * Create a new Job Order and attach passengers.
     */
    public function create(array $data, int $userId): JobOrder
    {
        return DB::transaction(function () use ($data, $userId) {
            $jo = JobOrder::create([
                'jo_number'    => $this->generateJONumber(),
                'customer_id'  => $data['customer_id'],
                'bus_id'       => $data['bus_id'],
                'created_by'   => $userId,
                'service_type' => $data['service_type'],
                'status'       => 'created',
                'service_date' => $data['service_date'],
                'destination'  => $data['destination'],
                'total_cost'   => $data['total_cost'],
                'notes'        => $data['notes'] ?? null,
            ]);

            // Attach passengers to the pivot table if provided
            if (!empty($data['passenger_ids'])) {
                $jo->passengers()->sync($data['passenger_ids']);
            }

            return $jo->load(['customer', 'bus', 'passengers']);
        });
    }

    /**
     * Update the status of a Job Order (state machine guard).
     * Valid transitions: draft → confirmed → in_progress → completed | cancelled
     */
    public function updateStatus(JobOrder $jo, string $newStatus): JobOrder
    {
        $validTransitions = [
            'created'       => ['confirmed', 'cancelled'],
            'confirmed'   => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
        ];

        $current = $jo->status;

        if (!isset($validTransitions[$current]) || !in_array($newStatus, $validTransitions[$current])) {
            throw new \InvalidArgumentException(
                "Cannot transition Job Order from '{$current}' to '{$newStatus}'."
            );
        }

        $jo->update(['status' => $newStatus]);
        return $jo->fresh();
    }

    /**
     * Generate auto-incrementing JO number: JO-2026-0001
     */
    private function generateJONumber(): string
    {
        $year = now()->year;
        $latest = JobOrder::where('jo_number', 'like', "JO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->jo_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('JO-%d-%04d', $year, $sequence);
    }
}
