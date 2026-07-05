<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowStep extends Model
{
    protected $fillable = [
        'definition_id',
        'order',
        'name',
        'approver_type',
        'approver_value',
        'condition_json',
    ];

    protected function casts(): array
    {
        return [
            'condition_json' => 'array',
        ];
    }

    public function definition()
    {
        return $this->belongsTo(WorkflowDefinition::class, 'definition_id');
    }
}
