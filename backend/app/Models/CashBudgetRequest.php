<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CashBudgetRequest extends Model
{
    protected $fillable = [
        'date',
        'travel_date',
        'plate_number',
        'destination',
        'diesel',
        'meal_allowance',
        'sop',
        'autosweep',
        'easytrip',
        'coach_captain_salary',
        'spare_driver_salary',
        'total_amount',
        'disbursed_amount',
        'status',
        'prepared_by',
        'approved_by',
        'disbursed_by',
        'purchase_order_id',
        'trip_ticket_id',
        'work_order_id',
        'commission_id',
        'liquidation_id',
    ];

    protected function casts(): array
    {
        return [
            'date'         => 'date',
            'travel_date'  => 'date',
            'total_amount' => 'decimal:2',
        ];
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function disbursedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disbursed_by');
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function tripTicket(): BelongsTo
    {
        return $this->belongsTo(TripTicket::class, 'trip_ticket_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class, 'commission_id');
    }

    public function liquidation(): BelongsTo
    {
        return $this->belongsTo(Liquidation::class, 'liquidation_id');
    }
}
