<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class POLineItem extends Model
{
    use HasFactory;

    protected $table = 'po_line_items';

    protected $fillable = [
        'purchase_order_id', 'item_name', 'description',
        'quantity', 'unit_price', 'total_price',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
