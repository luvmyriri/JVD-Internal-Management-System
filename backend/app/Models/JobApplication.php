<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'position_applied',
        'status',
        'resume_url',
        'cover_letter_url',
        'notes',
        'checklist',
        'converted_user_id',
    ];

    protected function casts(): array
    {
        return [
            'checklist' => 'array',
            'converted_user_id' => 'integer',
        ];
    }

    public function documents()
    {
        return $this->hasMany(JobApplicationDocument::class);
    }

    public function convertedEmployee()
    {
        return $this->belongsTo(\App\Models\User::class, 'converted_user_id');
    }
}
