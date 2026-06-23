<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionItem extends Model
{
    protected $fillable = [
        'commission_id', 'travel_date', 'destination', 'quantity', 'amount'
    ];

    public function commission()
    {
        return $this->belongsTo(Commission::class);
    }
}

