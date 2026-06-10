<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

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
        });
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

            // Find matching inventory item (case-insensitive)
            $item = \App\Models\InventoryItem::where('item_name', $itemName)->first();
            if (!$item) {
                $item = \App\Models\InventoryItem::get()->first(function ($i) use ($itemName) {
                    return strtolower(trim($i->item_name)) === strtolower(trim($itemName));
                });
            }
            if (!$item) {
                // Try fuzzy lookup (item name is contained within the string)
                $item = \App\Models\InventoryItem::get()->first(function ($i) use ($itemName) {
                    return str_contains(strtolower($itemName), strtolower($i->item_name)) 
                        || str_contains(strtolower($i->item_name), strtolower($itemName));
                });
            }

            if ($item) {
                $item->quantity = max(0, $item->quantity - $qty);
                $item->save();

                if (class_exists(\App\Http\Services\AuditLogService::class)) {
                    \App\Http\Services\AuditLogService::log(
                        action: 'DEDUCT_INVENTORY_MAINTENANCE',
                        module: 'inventory',
                        entityType: 'inventory_item',
                        entityId: $item->id,
                        new: ['quantity' => $item->quantity, 'deducted' => $qty, 'reason' => 'Used in Work Order']
                    );
                }
            }
        }
    }
}
