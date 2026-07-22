<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

abstract class SalesFulfillment extends Model
{
    protected $guarded = [];
    public function orderItem() { return $this->belongsTo(SalesOrderItem::class, 'sales_order_item_id'); }
}
