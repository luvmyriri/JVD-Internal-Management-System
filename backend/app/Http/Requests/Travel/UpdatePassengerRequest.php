<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePassengerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'       => ['sometimes', 'string', 'max:100'],
            'last_name'        => ['sometimes', 'string', 'max:100'],
            'birth_date'       => ['nullable', 'date', 'before:today'],
            'passport_no'      => ['nullable', 'string', 'max:50'],
            'contact_no'       => ['nullable', 'string', 'max:30'],
            'checklist_status' => ['nullable', 'array'],
        ];
    }
}
