<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EducationalTourBookingPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'booking_id',
        'collection_payment_id',
        'installment_number',
        'payment_kind',
        'payment_method',
        'amount',
        'currency',
        'status',
        'provider_reference',
        'idempotency_key',
        'paid_at',
        'posted_at',
        'received_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'installment_number' => 'integer',
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'posted_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(EducationalTourParticipantBooking::class, 'booking_id');
    }

    public function collectionPayment(): BelongsTo
    {
        return $this->belongsTo(CollectionPayment::class, 'collection_payment_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
