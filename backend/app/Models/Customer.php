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

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function passports()
    {
        return $this->hasMany(CustomerPassport::class);
    }

    public function visas()
    {
        return $this->hasMany(CustomerVisa::class);
    }

    public function kycs()
    {
        return $this->hasMany(CustomerKyc::class);
    }

    public function tasks()
    {
        return $this->hasMany(AgentTask::class);
    }
}
