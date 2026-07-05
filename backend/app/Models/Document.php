<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'doc_number',
        'title',
        'category_id',
        'tags',
        'storage_type',
        'file_path',
        'mime',
        'size',
        'checksum',
        'physical_location',
        'custodian_id',
        'issue_date',
        'expiry_date',
        'retention_until',
        'status',
        'source',
        'uploaded_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'issue_date' => 'date',
        'expiry_date' => 'date',
        'retention_until' => 'date',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(DocumentCategory::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'custodian_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class);
    }
}
