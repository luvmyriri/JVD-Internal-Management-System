<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JoinerReservation extends Model
{
    protected $fillable = ['departure_id', 'customer_id', 'invoice_id', 'reference', 'lead_name', 'lead_email', 'lead_contact', 'passenger_count', 'status', 'hold_expires_at', 'created_by'];
    protected function casts(): array { return ['hold_expires_at' => 'datetime']; }
    public function departure(): BelongsTo { return $this->belongsTo(JoinerDeparture::class, 'departure_id'); }
    public function seats(): HasMany { return $this->hasMany(JoinerDepartureSeat::class, 'reservation_id'); }
    public function passengers(): HasMany { return $this->hasMany(JoinerPassenger::class, 'reservation_id'); }
    public function invoice(): BelongsTo { return $this->belongsTo(Invoice::class); }
}
