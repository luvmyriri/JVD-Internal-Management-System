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
        'status',
        'prepared_by',
        'approved_by',
        'purchase_order_id',
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

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }
}
