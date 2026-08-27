<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EducationalTourBusAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'package_id',
        'bus_id',
        'driver_id',
        'sequence_number',
        'capacity_snapshot',
        'status',
        'assigned_at',
        'released_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sequence_number' => 'integer',
            'capacity_snapshot' => 'integer',
            'assigned_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(EducationalTourPackage::class, 'package_id');
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class, 'bus_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function participantBookings(): HasMany
    {
        return $this->hasMany(EducationalTourParticipantBooking::class, 'bus_assignment_id');
    }

    public function tripTicket(): HasOne
    {
        return $this->hasOne(TripTicket::class, 'educational_tour_bus_assignment_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
