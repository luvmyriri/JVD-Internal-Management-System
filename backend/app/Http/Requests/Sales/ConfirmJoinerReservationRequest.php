<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmJoinerReservationRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'passengers' => ['required', 'array', 'min:1'],
            'passengers.*.seat_code' => ['required', 'string', 'distinct'],
            'passengers.*.first_name' => ['required', 'string', 'max:100'],
            'passengers.*.last_name' => ['required', 'string', 'max:100'],
            'passengers.*.passenger_type' => ['required', 'in:adult,child'],
            'passengers.*.date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'passengers.*.emergency_contact' => ['nullable', 'string', 'max:100'],
            'passengers.*.special_needs' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', 'in:Cash,GCash,Card,Bank Transfer'],
            'payment_type' => ['required', 'in:full,downpayment'],
            'amount_received' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
