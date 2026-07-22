<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CharterRatePlan extends Model
{
    protected $fillable = ['service_id', 'name', 'vehicle_class', 'base_price', 'included_hours', 'included_kilometers', 'extra_hour_rate', 'extra_kilometer_rate', 'overnight_rate', 'includes_driver', 'includes_fuel', 'includes_tolls', 'includes_parking', 'is_active', 'created_by'];
    protected function casts(): array { return ['base_price' => 'decimal:2', 'extra_hour_rate' => 'decimal:2', 'extra_kilometer_rate' => 'decimal:2', 'overnight_rate' => 'decimal:2', 'includes_driver' => 'boolean', 'includes_fuel' => 'boolean', 'includes_tolls' => 'boolean', 'includes_parking' => 'boolean', 'is_active' => 'boolean']; }
    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function bookings(): HasMany { return $this->hasMany(CharterBooking::class, 'rate_plan_id'); }
}

