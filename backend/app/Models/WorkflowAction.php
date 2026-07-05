<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowAction extends Model
{
    protected $fillable = [
        'instance_id',
        'step',
        'user_id',
        'decision',
        'comment',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'acted_at' => 'datetime',
        ];
    }

    public function instance()
    {
        return $this->belongsTo(WorkflowInstance::class, 'instance_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
