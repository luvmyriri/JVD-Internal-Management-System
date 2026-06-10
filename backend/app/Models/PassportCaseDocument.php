<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PassportCaseDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'passport_case_id', 'customer_id', 'title', 'file_path', 'uploaded_by'
    ];

    public function passportCase()
    {
        return $this->belongsTo(PassportCase::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
