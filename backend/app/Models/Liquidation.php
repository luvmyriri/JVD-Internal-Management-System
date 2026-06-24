<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Liquidation extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function items()
    {
        return $this->hasMany(LiquidationItem::class);
    }

    public function tripTicket()
    {
        return $this->belongsTo(TripTicket::class, 'trip_ticket_id');
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function cashBudgetRequest()
    {
        return $this->hasOne(CashBudgetRequest::class, 'liquidation_id');
    }
}
