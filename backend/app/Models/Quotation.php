<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
        'client_name', 'quotation_date', 'travel_date', 'pick_up', 'destination',
        'no_of_days', 'no_of_units', 'rates', 'mark_up',
        'diesel', 'toll_fee', 'meal_allowance', 'salary', 'sop', 'commission', 'contingency_fund',
        'total_expenses', 'net_income', 'status', 'prepared_by', 'approved_by'
    ];

    protected $casts = [
        'quotation_date' => 'date',
        'travel_date' => 'date',
    ];

    public function preparer()
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
