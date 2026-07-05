<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowDefinition extends Model
{
    protected $fillable = ['module', 'name', 'active'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function steps()
    {
        return $this->hasMany(WorkflowStep::class, 'definition_id')->orderBy('order');
    }
}
