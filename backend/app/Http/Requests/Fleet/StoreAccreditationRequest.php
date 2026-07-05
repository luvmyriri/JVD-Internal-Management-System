<?php

namespace App\Http\Requests\Fleet;

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
            'entity_type'        => ['required', 'in:company,driver,bus'],
            'entity_id'          => ['required', 'integer'],
            'accreditation_type' => ['required', 'string', 'max:100'],
            'issuing_body'       => ['required', 'string', 'max:150'],
            'issue_date'         => ['required', 'date'],
            'expiry_date'        => ['required', 'date', 'after:issue_date'],
            'document_url'       => ['nullable', 'string', 'max:500'],
        ];
    }
}
