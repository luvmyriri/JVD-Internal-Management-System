<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JoinerDeparture extends Model
{
    protected $fillable = ['service_id', 'code', 'starts_at', 'ends_at', 'booking_cutoff_at', 'timezone', 'capacity', 'held_count', 'confirmed_count', 'bus_id', 'driver_id', 'pickup_instructions', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'booking_cutoff_at' => 'datetime'];
    }

    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function bus(): BelongsTo { return $this->belongsTo(Bus::class); }
    public function driver(): BelongsTo { return $this->belongsTo(User::class, 'driver_id'); }
    public function seats(): HasMany { return $this->hasMany(JoinerDepartureSeat::class, 'departure_id'); }
    public function reservations(): HasMany { return $this->hasMany(JoinerReservation::class, 'departure_id'); }

    public function getAvailableCountAttribute(): int
    {
        return max(0, $this->capacity - $this->held_count - $this->confirmed_count);
    }

    protected static function booted(): void
    {
        static::saved(function (self $departure) {
            $allocations = app(\App\Services\ResourceAllocationService::class);
            if (in_array($departure->status, ['cancelled', 'completed'], true)) {
                $allocations->release($departure);
                return;
            }
            $allocations->reserve($departure, $departure->bus_id, $departure->driver_id, $departure->starts_at, $departure->ends_at, $departure->code, $departure->status);
        });

        static::deleted(fn (self $departure) => app(\App\Services\ResourceAllocationService::class)->release($departure));
    }
}
