<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerPassport extends Model
{
    protected $fillable = [
        'customer_id',
        'passport_number',
        'issue_country',
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
