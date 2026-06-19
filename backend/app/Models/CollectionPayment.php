<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionPayment extends Model
{
    protected $fillable = [
        'collection_id', 'payment_date', 'payment_method', 'amount', 'balance'
    ];
}

