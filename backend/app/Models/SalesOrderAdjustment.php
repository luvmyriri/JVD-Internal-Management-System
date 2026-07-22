<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesOrderAdjustment extends Model
{
    protected $guarded = [];
    protected function casts(): array { return ['amount' => 'decimal:2', 'change_set' => 'array', 'approved_at' => 'datetime', 'effective_at' => 'datetime']; }
    public function order() { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }
    public function invoice() { return $this->belongsTo(Invoice::class); }
}
