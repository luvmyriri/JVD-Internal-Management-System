<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin', 'agent');
    }

    public function rules(): array
    {
        return [
            'customer_id'   => ['required', 'integer', 'exists:customers,id'],
            'bus_id'        => ['required', 'integer', 'exists:buses,id'],
            'service_type'  => ['required', 'in:charter,package,provincial,airport_transfer,other'],
            'service_date'  => ['required', 'date', 'after_or_equal:today'],
            'destination'   => ['required', 'string', 'max:255'],
            'total_cost'    => ['required', 'numeric', 'min:0'],
            'notes'         => ['nullable', 'string', 'max:1000'],
            'passenger_ids' => ['nullable', 'array'],
            'passenger_ids.*'=> ['integer', 'exists:passengers,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.exists'   => 'The selected customer does not exist.',
            'bus_id.exists'        => 'The selected bus does not exist.',
            'service_date.after_or_equal' => 'Service date cannot be in the past.',
            'passenger_ids.*.exists'       => 'One or more passenger IDs are invalid.',
        ];
    }
}
