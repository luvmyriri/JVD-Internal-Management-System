<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAccreditationKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nda_document_url'   => 'nullable|string',
            'terms_document_url' => 'nullable|string',
            'kyc_document_url'   => 'nullable|string',
            'entity_name'        => 'nullable|string|max:255',
            'contact_person'     => 'nullable|string|max:255',
            'contact_email'      => 'nullable|string|email|max:255',
        ];
    }
}
