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
        'cost', 'auto_generated', 'trip_ticket_id',
    ];

    protected function casts(): array
    {
        return [
            'cost'           => 'decimal:2',
            'auto_generated' => 'boolean',
            'approved_at'    => 'datetime',
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
}
