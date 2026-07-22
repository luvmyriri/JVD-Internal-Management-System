<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JoinerDepartureSeat extends Model
{
    protected $fillable = ['departure_id', 'seat_code', 'reservation_id', 'status', 'held_until'];
    protected function casts(): array { return ['held_until' => 'datetime']; }
    public function departure(): BelongsTo { return $this->belongsTo(JoinerDeparture::class, 'departure_id'); }
    public function reservation(): BelongsTo { return $this->belongsTo(JoinerReservation::class, 'reservation_id'); }
}

