<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Bus extends Model
{
    use HasFactory;

    protected $fillable = [
        'plate_number', 'model', 'bus_category', 'seating_capacity', 'status',
        'total_mileage', 'last_service_date', 'next_service_due', 'assigned_driver',
        'custom_seats',
    ];

    protected function casts(): array
    {
        return [
            'total_mileage' => 'float',
            'last_service_date' => 'date',
            'next_service_due' => 'date',
            'custom_seats' => 'array',
        ];
    }

    public function jobOrders()
    {
        return $this->hasMany(JobOrder::class);
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function accreditations()
    {
        return $this->hasMany(Accreditation::class, 'entity_id')
            ->where('entity_type', 'bus');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'assigned_driver');
    }

    public function tripTickets()
    {
        return $this->hasMany(\App\Models\TripTicket::class);
    }

    public function invoices()
    {
        return $this->hasMany(\App\Models\Invoice::class);
    }
}
