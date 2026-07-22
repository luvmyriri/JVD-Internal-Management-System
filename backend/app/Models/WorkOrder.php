<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

class WorkOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'wo_number', 'type', 'bus_id', 'invoice_id', 'assigned_to', 'created_by',
        'approved_by', 'approved_at', 'approval_notes',
        'status', 'priority', 'description', 'parts_used',
        'cost', 'auto_generated', 'trip_ticket_id', 'supplies_deducted',
    ];

    protected function casts(): array
    {
        return [
            'cost'              => 'decimal:2',
            'auto_generated'    => 'boolean',
            'supplies_deducted' => 'boolean',
            'approved_at'       => 'datetime',
        ];
    }

    // ── Helpers ─────────────────────────────────────────────────────

    public function isTrip(): bool
    {
        return $this->type === 'trip';
    }

    public function isMaintenance(): bool
    {
        return $this->type === 'maintenance';
    }


    // ── Relationships ───────────────────────────────────────────────

    public function tripTicket()
    {
        return $this->belongsTo(TripTicket::class, 'trip_ticket_id');
    }

    public function bus()
    {
        return $this->belongsTo(Bus::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function jobOrders()
    {
        return $this->hasMany(JobOrder::class);
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /** Returns true if this WO is waiting for the designated employee's approval. */
    public function isPendingApproval(): bool
    {
        return $this->status === 'pending_approval';
    }

    /** Returns true only when the WO is fully approved and ready to execute. */
    public function isApproved(): bool
    {
        return $this->approved_by !== null && $this->status !== 'pending_approval';
    }

    protected static function booted(): void
    {
        static::saved(function (WorkOrder $workOrder) {
            if ($workOrder->status === 'completed' && !empty($workOrder->parts_used) && !$workOrder->supplies_deducted) {
                // Prevent infinite loop by updating quietly
                $workOrder->supplies_deducted = true;
                $workOrder->saveQuietly();

                // Deduct supplies
                self::deductSupplies($workOrder->parts_used);
            }

            self::syncToPmsSchedules($workOrder);
            self::syncToResourceAllocations($workOrder);
        });

        static::deleted(function (WorkOrder $workOrder) {
            self::deleteFromPmsSchedules($workOrder);
            app(\App\Services\ResourceAllocationService::class)->release($workOrder);
        });
    }

    public static function syncToPmsSchedules(WorkOrder $workOrder): void
    {
        if ($workOrder->type !== 'maintenance' || $workOrder->status === 'cancelled' || !$workOrder->bus_id) {
            self::deleteFromPmsSchedules($workOrder);
            return;
        }

        $jobOrder = \App\Models\JobOrder::where('work_order_id', $workOrder->id)->first();
        $date = $jobOrder ? ($jobOrder->service_date ? $jobOrder->service_date->toDateString() : null) : null;
        $date = $date ?? ($workOrder->created_at ? $workOrder->created_at->toDateString() : now()->toDateString());
        $jobOrderId = $jobOrder ? $jobOrder->id : null;

        \DB::table('pms_schedules')->updateOrInsert(
            ['work_order_id' => $workOrder->id],
            [
                'bus_id' => $workOrder->bus_id,
                'job_order_id' => $jobOrderId,
                'maintenance_date' => $date,
                'duration' => '1 day',
                'status' => $workOrder->status,
                'description' => $workOrder->description ?? 'Maintenance Work Order',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public static function deleteFromPmsSchedules(WorkOrder $workOrder): void
    {
        \DB::table('pms_schedules')
            ->where('work_order_id', $workOrder->id)
            ->delete();
    }

    /** Keep maintenance downtime in the same fleet allocation ledger as sales and dispatch. */
    public static function syncToResourceAllocations(WorkOrder $workOrder): void
    {
        $allocations = app(\App\Services\ResourceAllocationService::class);
        if ($workOrder->type !== 'maintenance' || in_array($workOrder->status, ['cancelled', 'completed'], true) || !$workOrder->bus_id) {
            $allocations->release($workOrder);
            return;
        }

        $schedule = PmsSchedule::where('work_order_id', $workOrder->id)->first();
        $start = \Carbon\Carbon::parse($schedule?->maintenance_date ?? $workOrder->created_at ?? now())->startOfDay();
        $allocations->reserve($workOrder, $workOrder->bus_id, null, $start, $start->copy()->addDay(), $workOrder->wo_number, $workOrder->status);
    }

    public static function deductSupplies(string $partsUsed): void
    {
        $parts = explode(',', $partsUsed);
        foreach ($parts as $part) {
            $part = trim($part);
            if (empty($part)) {
                continue;
            }

            $itemName = $part;
            $qty = 1;

            // Pattern matches:
            // 1. "Item Name: 2" or "Item Name - 2" or "Item Name (2)"
            if (preg_match('/^(.*?)\s*[:\-\(]\s*(\d+)\s*\)?$/', $part, $matches)) {
                $itemName = trim($matches[1]);
                $qty = (int)$matches[2];
            }
            // 2. "2 x Item Name"
            elseif (preg_match('/^(\d+)\s*x\s*(.*?)$/i', $part, $matches)) {
                $itemName = trim($matches[2]);
                $qty = (int)$matches[1];
            }
            // 3. "2 Item Name"
            elseif (preg_match('/^(\d+)\s+(.*?)$/', $part, $matches)) {
                $itemName = trim($matches[2]);
                $qty = (int)$matches[1];
            }

            if ($qty < 1) {
                $qty = 1;
            }

            // C-02 / Ops C-08: resolve the item at the database level with an exact,
            // case-insensitive match instead of hydrating the entire inventory table
            // into memory. H-01: the previous fuzzy substring fallback is removed because
            // it could silently deduct from the wrong item (e.g. "oil" -> "Coil Spring").
            $normalized = strtolower(trim($itemName));

            // H-04: lock the row and decrement atomically so concurrent work orders
            // cannot clobber each other's quantity updates.
            DB::transaction(function () use ($normalized, $qty) {
                $item = \App\Models\InventoryItem::whereRaw('LOWER(TRIM(item_name)) = ?', [$normalized])
                    ->lockForUpdate()
                    ->first();

                if (!$item) {
                    return;
                }

                $deducted = min($qty, (int) $item->quantity);
                if ($deducted > 0) {
                    $item->decrement('quantity', $deducted);
                }

                if (class_exists(\App\Services\AuditLogService::class)) {
                    \App\Services\AuditLogService::log(
                        action: 'DEDUCT_INVENTORY_MAINTENANCE',
                        module: 'inventory',
                        entityType: 'inventory_item',
                        entityId: $item->id,
                        new: ['quantity' => $item->fresh()->quantity, 'deducted' => $deducted, 'reason' => 'Used in Work Order']
                    );
                }
            });
        }
    }
}
