<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LegalDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_order_id', 'title', 'document_type',
        'file_path', 'uploaded_by', 'notes',
    ];

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
