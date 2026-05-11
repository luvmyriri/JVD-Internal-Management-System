<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WorkOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'wo_number', 'bus_id', 'assigned_to', 'created_by',
        'status', 'priority', 'description', 'parts_used',
        'cost', 'auto_generated',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'auto_generated' => 'boolean',
        ];
    }

    public function bus()
    {
        return $this->belongsTo(Bus::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
