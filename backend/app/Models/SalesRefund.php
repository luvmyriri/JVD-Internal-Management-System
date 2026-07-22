<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesRefund extends Model
{
    protected $guarded = [];
    protected function casts(): array { return ['amount' => 'decimal:2', 'approved_at' => 'datetime', 'processed_at' => 'datetime']; }
    public function order() { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }
    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function creditNote() { return $this->belongsTo(CreditNote::class); }
}
