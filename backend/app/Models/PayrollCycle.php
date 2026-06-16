<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollCycle extends Model
{
    use HasFactory;

    protected $fillable = [
        'start_date',
        'end_date',
        'gross_amount',
        'tax_amount',
        'net_amount',
        'status',
        'released_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'released_at' => 'datetime',
        'gross_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
    }
}
