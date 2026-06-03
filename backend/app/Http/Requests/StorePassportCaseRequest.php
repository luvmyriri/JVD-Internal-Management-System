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
            'customer_id'    => ['required', 'integer', 'exists:customers,id'],
            'passenger_id'   => ['required', 'integer', 'exists:passengers,id'],
            'case_type'      => ['required', 'in:passport,visa'],
            'checklist'      => ['nullable', 'array'],
            'release_date'   => ['nullable', 'date', 'after:today'],
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
