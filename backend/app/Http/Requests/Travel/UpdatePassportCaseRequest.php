<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePassportCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'           => ['sometimes', 'string'],
            'reference_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'checklist'        => ['sometimes', 'nullable', 'array'],
            'submitted_date'   => ['sometimes', 'nullable', 'date'],
            'release_date'     => ['sometimes', 'nullable', 'date'],
            'handled_by'       => ['sometimes', 'integer', 'exists:users,id'],
        ];
    }
}
