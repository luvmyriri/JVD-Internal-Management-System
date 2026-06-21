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
                'invoice_id'   => $data['invoice_id'] ?? null,
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
            'draft'         => ['confirmed', 'cancelled'],
            'confirmed'   => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
        ];

        $current = $jo->status;

        if (!isset($validTransitions[$current]) || !in_array($newStatus, $validTransitions[$current])) {
            throw new \InvalidArgumentException(
                "Cannot transition Job Order from '{$current}' to '{$newStatus}'."
            );
        }

        // Automatic driver resolution if bus is assigned
        if ($jo->bus_id && !$jo->driver_id) {
            $bus = \App\Models\Bus::find($jo->bus_id);
            if ($bus) {
                $jo->driver_id = $bus->assigned_driver;
                if ($bus->driver) {
                    $jo->driver_name = "{$bus->driver->first_name} {$bus->driver->last_name}";
                }
            }
        }

        // Strict Process Guard:
        $isSuperAdmin = auth()->user() && auth()->user()->hasRole('super_admin');
        if ($newStatus === 'confirmed' && $jo->service_type !== 'maintenance' && !$isSuperAdmin) {
            if (!$jo->bus_id) {
                throw new \InvalidArgumentException("Cannot confirm Job Order: A vehicle (bus) must be assigned first.");
            }
            if (!$jo->driver_id) {
                throw new \InvalidArgumentException("Cannot confirm Job Order: A Coach Captain (driver) must be assigned first.");
            }
        }

        $jo->update(['status' => $newStatus]);

        // Auto-generate WorkOrder or TripTicket depending on JO type when confirmed
        if ($newStatus === 'confirmed') {
            if ($jo->service_type === 'maintenance') {
                // Maintenance Track: Auto-generate Work Order from Job Order
                if (!$jo->work_order_id) {
                    $year = now()->year;
                    $latestWo = \App\Models\WorkOrder::withTrashed()->where('wo_number', 'like', "WO-{$year}-%")->orderByDesc('id')->first();
                    $sequence = 1;
                    if ($latestWo) {
                        $parts = explode('-', $latestWo->wo_number);
                        $sequence = (int) end($parts) + 1;
                    }
                    $woNumber = sprintf('WO-%d-%04d', $year, $sequence);

                    $wo = \App\Models\WorkOrder::create([
                        'wo_number'      => $woNumber,
                        'bus_id'         => $jo->bus_id,
                        'assigned_to'    => $jo->driver_id, // e.g. assigned mechanic if we mapped driver_id
                        'created_by'     => auth()->id() ?? $jo->created_by ?? 1,
                        'status'         => 'open', // Auto-open because the Job Order authorization was already confirmed
                        'priority'       => 'routine',
                        'description'    => "Execution task for authorized Maintenance Job Order {$jo->jo_number}. " . $jo->notes,
                        'auto_generated' => true,
                    ]);

                    $jo->update(['work_order_id' => $wo->id]);
                    \App\Http\Services\NotificationService::notifyWorkOrderRequest($wo);
                }
            } else {
                // Travel Track: Auto-generate Trip Ticket
                $existingTicket = \App\Models\TripTicket::where('job_order_id', $jo->id)->first();
                if (!$existingTicket) {
                    $year = now()->year;
                    $latest = \App\Models\TripTicket::where('control_no', 'like', "TT-{$year}-%")->orderByDesc('id')->first();
                    $sequence = 1;
                    if ($latest) {
                        $parts = explode('-', $latest->control_no);
                        $sequence = (int) end($parts) + 1;
                    }
                    $controlNo = sprintf('TT-%d-%04d', $year, $sequence);

                    $ticket = \App\Models\TripTicket::create([
                        'control_no' => $controlNo,
                        'issue_date' => now()->toDateString(),
                        'date_of_travel' => $jo->service_date ?? now()->toDateString(),
                        'duration' => '1 Day',
                        'pick_up' => 'Terminal / Branch',
                        'drop_off' => $jo->destination ?? 'TBD',
                        'bus_id' => $jo->bus_id,
                        'plate_no' => $jo->bus?->plate_number,
                        'no_of_passengers' => $jo->passengers()->count() ?: 1,
                        'driver_id' => $jo->driver_id,
                        'requested_by' => $jo->created_by ?? auth()->id() ?? 1,
                        'status' => 'draft',
                        'job_order_id' => $jo->id,
                    ]);

                    if ($ticket->bus_id) {
                        app(\App\Http\Controllers\TripTicketController::class)->autoGeneratePreTripWorkOrder($ticket);
                    }
                }
            }
        }

        if ($newStatus === 'completed' && $jo->work_order_id) {
            $wo = \App\Models\WorkOrder::find($jo->work_order_id);
            if ($wo && $wo->status !== 'completed') {
                $wo->update(['status' => 'completed']);
                
                // Recalculate PMS next service if auto-generated
                if ($wo->auto_generated && $wo->bus_id) {
                    $maintenanceService = app(\App\Http\Services\MaintenanceService::class);
                    $maintenanceService->recalculateNextService($wo->bus);
                }

                // If linked to a trip ticket, send notification!
                if ($wo->trip_ticket_id) {
                    $ticket = \App\Models\TripTicket::find($wo->trip_ticket_id);
                    if ($ticket) {
                        \App\Http\Services\NotificationService::notifyPreTripCleared($ticket);
                    }
                }
            }
        }

        return $jo->fresh();

    }

    /**
     * Generate auto-incrementing JO number: JO-2026-0001
     */
    private function generateJONumber(): string
    {
        $year = now()->year;
        // H-03: lock the latest row so concurrent create() transactions cannot read the same sequence.
        $latest = JobOrder::withTrashed()
            ->where('jo_number', 'like', "JO-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->jo_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('JO-%d-%04d', $year, $sequence);
    }
}
