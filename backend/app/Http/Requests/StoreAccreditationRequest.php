<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccreditationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entity_type' => 'required|string',
            'entity_name' => 'required|string',
            'accreditation_type' => 'required|string',
            'issuing_body' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'contact_person' => 'required|string',
            'contact_email' => 'required|email',
            'custom_documents' => 'nullable|array|max:20',
            'custom_documents.*' => 'required|string|max:100',
        ];
    }
}
