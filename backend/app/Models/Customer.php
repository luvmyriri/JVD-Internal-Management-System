<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name', 'last_name', 'email', 'phone', 'address', 'notes',
    ];

    public function passengers()
    {
        return $this->hasMany(Passenger::class);
    }

    public function jobOrders()
    {
        return $this->hasMany(JobOrder::class);
    }
}
