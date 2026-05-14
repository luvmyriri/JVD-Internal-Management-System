<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Accreditation extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type', 'entity_id', 'accreditation_type',
        'issuing_body', 'issue_date', 'expiry_date',
        'status', 'document_url',
        'nda_document_url', 'terms_document_url', 'kyc_document_url',
        'entity_name', 'contact_person', 'contact_email'
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'expiry_date' => 'date',
        ];
    }
}
