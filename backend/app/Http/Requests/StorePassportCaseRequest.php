<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePassportCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('travel', 'create');
    }

    public function rules(): array
    {
        return [
            'customer_id'         => ['sometimes', 'nullable', 'integer', 'exists:customers,id'],
            'passenger_id'        => ['sometimes', 'nullable', 'integer', 'exists:passengers,id'],
            'first_name'          => ['required_without:customer_id', 'nullable', 'string', 'max:255'],
            'last_name'           => ['required_without:customer_id', 'nullable', 'string', 'max:255'],
            'middle_name'         => ['nullable', 'string', 'max:255'],
            'suffix'              => ['nullable', 'string', 'max:255'],
            'email'               => ['nullable', 'string', 'email', 'max:255'],
            'phone'               => ['nullable', 'string', 'max:100'],
            'address'             => ['nullable', 'string'],
            'birth_date'          => ['nullable', 'date'],
            'case_type'           => ['required', 'in:passport,visa'],
            'checklist'           => ['nullable', 'array'],
            'release_date'        => ['nullable', 'date', 'after:today'],
            'destination_country' => ['nullable', 'string', 'max:100'],
            'visa_type'           => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.exists'  => 'The selected customer does not exist.',
            'passenger_id.exists' => 'The selected passenger does not exist.',
        ];
    }
}
