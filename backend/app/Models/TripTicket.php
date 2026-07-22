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

    public function salesOrderItem()
    {
        return $this->belongsTo(SalesOrderItem::class);
    }

    protected static function booted(): void
    {
        static::saved(function ($tripTicket) {
            self::syncToTravelSchedules($tripTicket);
            $allocations = app(\App\Services\ResourceAllocationService::class);

            // A sales-generated DTT is the operational document for an allocation
            // already owned by its typed fulfillment. Keep one central allocation
            // row instead of reserving the same bus and driver a second time under
            // the TripTicket model.
            $salesItem = $tripTicket->salesOrderItem()
                ->with(['fulfillment', 'order'])
                ->first();
            if ($salesItem?->fulfillment) {
                $allocations->release($tripTicket); // repairs any historical duplicate
                if ($tripTicket->status === 'completed') {
                    \App\Models\ResourceAllocation::where('source_type', $salesItem->fulfillment->getMorphClass())
                        ->where('source_id', $salesItem->fulfillment->getKey())
                        ->update(['status' => 'completed']);
                    return;
                }

                $start = $salesItem->scheduled_start;
                $end = $salesItem->scheduled_end;
                if ($start && $end) {
                    $allocations->reserve(
                        $salesItem->fulfillment,
                        $tripTicket->bus_id,
                        $tripTicket->driver_id,
                        $start,
                        $end,
                        $tripTicket->control_no,
                        'confirmed'
                    );
                }
                return;
            }

            if (in_array($tripTicket->status, ['cancelled', 'completed'], true)) {
                $allocations->release($tripTicket);
                return;
            }
            $start = \Carbon\Carbon::parse($tripTicket->date_of_travel);
            $end = $start->copy()->addDay();
            $allocations->reserve($tripTicket, $tripTicket->bus_id, $tripTicket->driver_id, $start, $end, $tripTicket->control_no, $tripTicket->status ?? 'draft');
        });

        static::deleted(function ($tripTicket) {
            self::deleteFromTravelSchedules($tripTicket);
            app(\App\Services\ResourceAllocationService::class)->release($tripTicket);
        });
    }

    public static function syncToTravelSchedules($tripTicket): void
    {
        if ($tripTicket->status === 'cancelled' || !$tripTicket->bus_id) {
            self::deleteFromTravelSchedules($tripTicket);
            return;
        }

        if ($tripTicket->invoice_id) {
            $booking = \App\Models\Booking::where('invoice_id', $tripTicket->invoice_id)->first();
            if ($booking) {
                \DB::table('travels')
                    ->where('reference_type', 'booking')
                    ->where('reference_id', $booking->id)
                    ->delete();
            }
        }

        $travelType = $tripTicket->trip_type === 'international' ? 'international' : 'local';

        // Sync trip ticket to travels table
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
