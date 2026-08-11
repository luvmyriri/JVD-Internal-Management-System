<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CharterRatePlan extends Model
{
    protected $fillable = [
        'service_id', 'name', 'vehicle_class', 'base_price', 'included_hours', 'included_kilometers',
        'extra_hour_rate', 'extra_kilometer_rate', 'overnight_rate', 'includes_driver', 'includes_fuel',
        'includes_tolls', 'includes_parking', 'garage_location', 'pickup_location', 'destination',
        'garage_distance_km', 'route_distance_km', 'total_distance_km', 'fuel_efficiency_km_per_liter',
        'estimated_liters', 'diesel_price_per_liter', 'diesel_cost', 'driver_meals', 'toll_gate_fees',
        'easytrip', 'autosweep', 'commission', 'desired_profit', 'total_expenses', 'projected_profit',
        'auto_adjust_rate', 'pricing_metadata', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2', 'extra_hour_rate' => 'decimal:2', 'extra_kilometer_rate' => 'decimal:2',
            'overnight_rate' => 'decimal:2', 'garage_distance_km' => 'decimal:2', 'route_distance_km' => 'decimal:2',
            'total_distance_km' => 'decimal:2', 'fuel_efficiency_km_per_liter' => 'decimal:2',
            'estimated_liters' => 'decimal:2', 'diesel_price_per_liter' => 'decimal:2', 'diesel_cost' => 'decimal:2',
            'driver_meals' => 'decimal:2', 'toll_gate_fees' => 'decimal:2', 'easytrip' => 'decimal:2',
            'autosweep' => 'decimal:2', 'commission' => 'decimal:2', 'desired_profit' => 'decimal:2',
            'total_expenses' => 'decimal:2', 'projected_profit' => 'decimal:2', 'auto_adjust_rate' => 'boolean',
            'pricing_metadata' => 'array', 'includes_driver' => 'boolean', 'includes_fuel' => 'boolean',
            'includes_tolls' => 'boolean', 'includes_parking' => 'boolean', 'is_active' => 'boolean',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(CharterBooking::class, 'rate_plan_id');
    }
}
