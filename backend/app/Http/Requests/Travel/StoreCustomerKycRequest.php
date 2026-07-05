<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type'   => 'required|string|max:255',
            'document_number' => 'nullable|string|max:255',
            'file_path'       => 'nullable|string',
            'notes'           => 'nullable|string',
        ];
    }
}
