<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverUnavailability extends Model
{
    protected $guarded = [];
    protected function casts(): array { return ['starts_at'=>'datetime','ends_at'=>'datetime','approved_at'=>'datetime']; }
    public function driver() { return $this->belongsTo(User::class, 'driver_id'); }

    protected static function booted(): void
    {
        static::saved(function (self $record) {
            $allocations = app(\App\Services\ResourceAllocationService::class);
            if ($record->status !== 'approved') { $allocations->release($record); return; }
            $allocations->reserve($record, null, $record->driver_id, $record->starts_at, $record->ends_at, ucfirst($record->type).': '.$record->reason, 'confirmed');
        });
        static::deleted(fn (self $record) => app(\App\Services\ResourceAllocationService::class)->release($record));
    }
}
