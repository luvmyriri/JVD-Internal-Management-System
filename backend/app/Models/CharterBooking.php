<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharterBooking extends Model
{
    protected $fillable = ['reference', 'rate_plan_id', 'customer_id', 'invoice_id', 'bus_id', 'driver_id', 'lead_name', 'lead_email', 'lead_contact', 'starts_at', 'ends_at', 'pickup_location', 'destination', 'stops', 'passenger_count', 'booking_mode', 'selected_seats', 'passengers', 'fleet_assignments', 'estimated_kilometers', 'base_price', 'extra_hours_amount', 'extra_kilometers_amount', 'overnight_amount', 'subtotal', 'pricing_snapshot', 'status', 'operations_notes', 'created_by'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'stops' => 'array', 'selected_seats' => 'array', 'passengers' => 'array', 'fleet_assignments' => 'array', 'pricing_snapshot' => 'array'];
    }

    public function ratePlan(): BelongsTo
    {
        return $this->belongsTo(CharterRatePlan::class, 'rate_plan_id');
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
