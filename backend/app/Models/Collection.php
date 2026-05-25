<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    protected $guarded = [];

    public function payments()
    {
        return $this->hasMany(CollectionPayment::class);
    }
}

