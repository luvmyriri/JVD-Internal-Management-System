<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JoinerPassenger extends Model
{
    protected $fillable = ['reservation_id', 'departure_seat_id', 'first_name', 'last_name', 'passenger_type', 'date_of_birth', 'emergency_contact', 'special_needs'];
    protected function casts(): array { return ['date_of_birth' => 'date']; }
    public function reservation(): BelongsTo { return $this->belongsTo(JoinerReservation::class, 'reservation_id'); }
    public function seat(): BelongsTo { return $this->belongsTo(JoinerDepartureSeat::class, 'departure_seat_id'); }
}
