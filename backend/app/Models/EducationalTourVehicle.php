<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EducationalTourVehicle extends Model
{
    protected $fillable = ['booking_id', 'bus_id', 'driver_id', 'capacity_snapshot', 'planned_passengers'];
    public function booking(): BelongsTo { return $this->belongsTo(EducationalTourBooking::class, 'booking_id'); }
    public function bus(): BelongsTo { return $this->belongsTo(Bus::class); }
    public function driver(): BelongsTo { return $this->belongsTo(User::class, 'driver_id'); }
}

