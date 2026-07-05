<?php

namespace App\Http\Requests\Fleet;

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
            'accreditation_type' => ['sometimes', 'string', 'max:100'],
            'issuing_body'       => ['sometimes', 'string', 'max:150'],
            'issue_date'         => ['sometimes', 'date'],
            'expiry_date'        => ['sometimes', 'date', 'after:issue_date'],
            'status'             => ['sometimes', 'in:active,expired,pending_renewal'],
            'document_url'       => ['nullable', 'string', 'max:500'],
        ];
    }
}
