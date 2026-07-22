<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResourceAllocation extends Model
{
    protected $fillable = [
        'bus_id', 'driver_id', 'source_type', 'source_id', 'starts_at', 'ends_at', 'status', 'reference',
    ];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime'];
    }

    public function bus() { return $this->belongsTo(Bus::class); }
    public function driver() { return $this->belongsTo(User::class, 'driver_id'); }
    public function source() { return $this->morphTo(); }
}
