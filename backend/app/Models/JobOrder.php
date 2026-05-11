<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'jo_number', 'customer_id', 'bus_id', 'created_by',
        'service_type', 'status', 'service_date', 'destination',
        'total_cost', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'total_cost' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function bus()
    {
        return $this->belongsTo(Bus::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function passengers()
    {
        return $this->belongsToMany(Passenger::class, 'job_order_passenger');
    }

    public function legalDocuments()
    {
        return $this->hasMany(LegalDocument::class);
    }
}
