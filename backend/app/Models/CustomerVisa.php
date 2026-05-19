<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerVisa extends Model
{
    protected $fillable = [
        'customer_id',
        'country',
        'visa_type',
        'visa_number',
        'issue_date',
        'expiry_date',
        'file_path',
        'notes',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
