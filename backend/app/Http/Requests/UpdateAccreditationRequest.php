<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccreditationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'string|in:active,expired,pending_renewal',
            // Allow manual overrides for documents in backend
            'kyc_document_url' => 'nullable|string',
            'nda_document_url' => 'nullable|string',
            'terms_document_url' => 'nullable|string',
        ];
    }
}
