<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
 
class DocumentCategory extends Model
{
    use HasFactory;
 
    protected $fillable = [
        'name',
        'slug',
        'allowed_roles',
    ];
 
    protected $casts = [
        'allowed_roles' => 'array',
    ];
}
