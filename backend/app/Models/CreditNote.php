<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditNote extends Model
{
    protected $guarded = [];
    protected function casts(): array { return ['subtotal' => 'decimal:2', 'tax_amount' => 'decimal:2', 'total_amount' => 'decimal:2', 'issued_at' => 'datetime', 'posted_at' => 'datetime']; }
    public function order() { return $this->belongsTo(SalesOrder::class, 'sales_order_id'); }
    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function refunds() { return $this->hasMany(SalesRefund::class); }
}
