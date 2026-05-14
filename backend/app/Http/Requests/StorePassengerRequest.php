<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePassengerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin', 'agent');
    }

    public function rules(): array
    {
        return [
            'customer_id'      => ['required', 'integer', 'exists:customers,id'],
            'first_name'       => ['required', 'string', 'max:100'],
            'last_name'        => ['required', 'string', 'max:100'],
            'birth_date'       => ['nullable', 'date', 'before:today'],
            'passport_no'      => ['nullable', 'string', 'max:50'],
            'contact_no'       => ['nullable', 'string', 'max:30'],
            'checklist_status' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.exists' => 'The selected customer does not exist.',
            'birth_date.before'  => 'Birth date must be in the past.',
        ];
    }
}
