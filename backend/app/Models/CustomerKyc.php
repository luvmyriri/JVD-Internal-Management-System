<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerKyc extends Model
{
    protected $fillable = [
        'customer_id',
        'document_type',
        'document_number',
        'file_path',
        'notes',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
