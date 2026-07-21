<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'invoice_id',
        'bus_id',
        'driver_id',
        'seat_map',
        'travel_date',
        'pickup_location',
        'tour_code',
        'pax_count',
        'arrival_datetime',
        'departure_datetime',
        'status',
    ];

    protected $casts = [
        'seat_map' => 'array',
        'travel_date' => 'date',
        'arrival_datetime' => 'datetime',
        'departure_datetime' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    protected static function booted(): void
    {
        static::saved(function ($booking) {
            self::syncToTravelSchedules($booking);
        });

        static::deleted(function ($booking) {
            self::deleteFromTravelSchedules($booking);
        });
    }

    public static function syncToTravelSchedules($booking): void
    {
        if ($booking->status === 'cancelled' || !$booking->bus_id || !$booking->travel_date) {
            self::deleteFromTravelSchedules($booking);
            return;
        }

        // If a TripTicket exists for this invoice, it supersedes the booking for travel scheduling
        $hasTripTicket = \DB::table('trip_tickets')->where('invoice_id', $booking->invoice_id)->exists();
        if ($hasTripTicket) {
            return;
        }

        \DB::table('travels')->updateOrInsert(
            ['reference_type' => 'booking', 'reference_id' => $booking->id],
            [
                'bus_id' => $booking->bus_id,
                'driver_id' => $booking->driver_id,
                'travel_date' => $booking->travel_date,
                'duration' => '1 day',
                'pick_up' => $booking->pickup_location ?? 'Not Specified',
                'drop_off' => $booking->tour_code ?? 'Not Specified',
                'status' => $booking->status ?? 'draft',
                'travel_type' => 'local',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public static function deleteFromTravelSchedules($booking): void
    {
        \DB::table('travels')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->delete();
    }
}
