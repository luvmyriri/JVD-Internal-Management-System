<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatGroup extends Model
{
    protected $primaryKey = 'group_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'group_id',
        'name',
        'creator_id',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function members()
    {
        return $this->hasMany(ChatGroupMember::class, 'group_id', 'group_id');
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'group_id', 'group_id');
    }
}
