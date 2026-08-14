<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class CollectionPayment extends Model
{
    protected $fillable = [
        'collection_id', 'payment_date', 'payment_method', 'amount', 'balance', 'idempotency_key',
        'paymongo_payment_id',
    ];

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw ValidationException::withMessages([
                'payment' => ['Posted payments are immutable. Record an approved adjusting entry instead of editing payment evidence.'],
            ]);
        });

        static::deleting(function (): never {
            throw ValidationException::withMessages([
                'payment' => ['Posted payments are immutable. Record an approved refund or adjusting entry instead of deleting payment evidence.'],
            ]);
        });
    }

    public function collection()
    {
        return $this->belongsTo(Collection::class);
    }
}
