<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PassportCase extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id', 'passenger_id', 'handled_by',
        'case_type', 'status', 'checklist', 'reference_number',
        'submitted_date', 'release_date',
    ];

    protected function casts(): array
    {
        return [
            'checklist' => 'array',
            'submitted_date' => 'date',
            'release_date' => 'date',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
