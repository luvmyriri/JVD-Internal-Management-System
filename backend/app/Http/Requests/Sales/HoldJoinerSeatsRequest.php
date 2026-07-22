<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class HoldJoinerSeatsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'lead_name' => ['required', 'string', 'max:255'],
            'lead_email' => ['nullable', 'email', 'max:255'],
            'lead_contact' => ['nullable', 'string', 'max:30'],
            'passenger_count' => ['required', 'integer', 'min:1'],
            'seat_codes' => ['required', 'array', 'min:1'],
            'seat_codes.*' => ['required', 'string', 'distinct'],
        ];
    }
}

