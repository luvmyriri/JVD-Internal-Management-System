<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerPassportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'passport_number' => 'required|string|max:255',
            'issue_country'   => 'nullable|string|max:255',
            'issue_date'      => 'nullable|date',
            'expiry_date'     => 'nullable|date',
            'file_path'       => 'nullable|string',
            'notes'           => 'nullable|string',
        ];
    }
}
