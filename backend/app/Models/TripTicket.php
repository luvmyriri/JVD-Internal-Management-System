<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripTicket extends Model
{
    protected $guarded = [];

    public function bus()
    {
        return $this->belongsTo(Bus::class, 'bus_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class, 'trip_ticket_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function cashBudgetRequest()
    {
        return $this->hasOne(CashBudgetRequest::class, 'trip_ticket_id');
    }
}

