<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'category',
        'service_type',
        'package_config',
        'price',
        'images',
        'is_active',
        'is_sales_catalog',
        'created_by',
        'child_discount',
        'has_booking_fields',
        'adult_price',
        'child_price',
        'is_tour',
        'bus_price',
        'coaster_price',
        'tour_kms',
        'tour_hours',
        'cost_breakdown',
        'inclusions',
        'exclusions',
        'max_pax',
        'fixed_date',
        'fixed_departure_time',
        'fixed_arrival_datetime',
        'bus_id',
        'driver_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'images' => 'array',
        'is_active' => 'boolean',
        'is_sales_catalog' => 'boolean',
        'package_config' => 'array',
        'child_discount' => 'decimal:2',
        'has_booking_fields' => 'boolean',
        'adult_price' => 'decimal:2',
        'child_price' => 'decimal:2',
        'is_tour' => 'boolean',
        'bus_price' => 'decimal:2',
        'coaster_price' => 'decimal:2',
        'tour_kms' => 'integer',
        'tour_hours' => 'integer',
        'max_pax' => 'integer',
        'fixed_date' => 'date',
        'bus_id' => 'integer',
        'driver_id' => 'integer',
        'inclusions' => 'array',
        'exclusions' => 'array',
    ];

    public function serviceCategory()
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bus()
    {
        return $this->belongsTo(\App\Models\Bus::class);
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
