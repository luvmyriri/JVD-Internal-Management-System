<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'pricing_model',
        'field_schema',
    ];

    protected $casts = [
        'field_schema' => 'array',
    ];

    public function services()
    {
        return $this->hasMany(Service::class);
    }
}
