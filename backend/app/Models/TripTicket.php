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

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    protected static function booted(): void
    {
        static::saved(function ($tripTicket) {
            self::syncToTravelSchedules($tripTicket);
        });

        static::deleted(function ($tripTicket) {
            self::deleteFromTravelSchedules($tripTicket);
        });
    }

    public static function syncToTravelSchedules($tripTicket): void
    {
        if ($tripTicket->status === 'cancelled' || !$tripTicket->bus_id) {
            self::deleteFromTravelSchedules($tripTicket);
            return;
        }

        $travelType = $tripTicket->trip_type === 'international' ? 'international' : 'local';

        \DB::table('travels')->updateOrInsert(
            ['reference_type' => 'trip_ticket', 'reference_id' => $tripTicket->id],
            [
                'bus_id' => $tripTicket->bus_id,
                'driver_id' => $tripTicket->driver_id,
                'travel_date' => $tripTicket->date_of_travel,
                'duration' => $tripTicket->duration ?? '1 day',
                'pick_up' => $tripTicket->pick_up,
                'drop_off' => $tripTicket->drop_off,
                'status' => $tripTicket->status ?? 'draft',
                'travel_type' => $travelType,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public static function deleteFromTravelSchedules($tripTicket): void
    {
        \DB::table('travels')
            ->where('reference_type', 'trip_ticket')
            ->where('reference_id', $tripTicket->id)
            ->delete();
    }
}

