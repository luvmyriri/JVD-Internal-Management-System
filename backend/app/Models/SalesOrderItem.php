<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SalesOrderItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2', 'unit_price' => 'decimal:2', 'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2', 'total_amount' => 'decimal:2', 'supplier_cost' => 'decimal:2',
            'scheduled_start' => 'datetime', 'scheduled_end' => 'datetime', 'details_snapshot' => 'array',
        ];
    }

    public function order(): BelongsTo { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }
    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function fulfillment(): MorphTo { return $this->morphTo(); }
}
