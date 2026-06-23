<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternationalTravel extends Model
{
    protected $table = 'international_travels';

    protected $fillable = [
        'bus_id',
        'driver_id',
        'travel_date',
        'duration',
        'pick_up',
        'drop_off',
        'status',
        'reference_id',
        'reference_type',
    ];

    protected function casts(): array
    {
        return [
            'travel_date' => 'date',
        ];
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
