<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowInstance extends Model
{
    protected $fillable = [
        'definition_id',
        'subject_type',
        'subject_id',
        'current_step',
        'status',
    ];

    public function definition()
    {
        return $this->belongsTo(WorkflowDefinition::class, 'definition_id');
    }

    public function subject()
    {
        return $this->morphTo();
    }

    public function actions()
    {
        return $this->hasMany(WorkflowAction::class, 'instance_id')->orderBy('acted_at');
    }
}
