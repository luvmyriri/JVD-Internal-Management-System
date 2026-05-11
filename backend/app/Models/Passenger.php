<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Passenger extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id', 'first_name', 'last_name', 'birth_date',
        'passport_no', 'contact_no', 'checklist_status',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'checklist_status' => 'array',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
