<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrder extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2', 'balance' => 'decimal:2', 'travel_starts_at' => 'datetime',
            'travel_ends_at' => 'datetime', 'metadata' => 'array',
        ];
    }

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function invoice(): BelongsTo { return $this->belongsTo(Invoice::class); }
    public function agent(): BelongsTo { return $this->belongsTo(User::class, 'agent_id'); }
    public function supersededOrder(): BelongsTo { return $this->belongsTo(self::class, 'supersedes_order_id'); }
    public function items(): HasMany { return $this->hasMany(SalesOrderItem::class)->orderBy('line_number'); }
    public function events(): HasMany { return $this->hasMany(SalesOrderEvent::class)->orderBy('occurred_at'); }
    public function adjustments(): HasMany { return $this->hasMany(SalesOrderAdjustment::class); }
    public function creditNotes(): HasMany { return $this->hasMany(CreditNote::class); }
    public function refunds(): HasMany { return $this->hasMany(SalesRefund::class); }
}
