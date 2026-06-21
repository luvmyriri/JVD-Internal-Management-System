<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePassenger extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id', 'first_name', 'last_name', 'date_of_birth', 'passport_number',
        'dietary_restrictions', 'emergency_contact', 'special_needs',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
