<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_cycle_id',
        'user_id',
        'base_salary',
        'allowances',
        'deductions',
        'tax_amount',
        'net_salary',
        'status',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'allowances' => 'decimal:2',
        'deductions' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'net_salary' => 'decimal:2',
    ];

    public function payrollCycle()
    {
        return $this->belongsTo(PayrollCycle::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
