<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharterBookingRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'rate_plan_id' => ['required', 'integer', 'exists:charter_rate_plans,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'lead_name' => ['required', 'string', 'max:255'],
            'lead_email' => ['nullable', 'email', 'max:255'],
            'lead_contact' => ['nullable', 'string', 'max:30'],
            'bus_id' => ['required', 'integer', 'exists:buses,id'],
            'driver_id' => ['nullable', 'integer', 'exists:users,id'],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'destination' => ['required', 'string', 'max:255', 'different:pickup_location'],
            'stops' => ['nullable', 'array', 'max:20'],
            'stops.*' => ['required', 'string', 'max:255'],
            'passenger_count' => ['required', 'integer', 'min:1', 'max:100'],
            'estimated_kilometers' => ['required', 'numeric', 'min:0', 'max:10000'],
            'operations_notes' => ['nullable', 'string', 'max:2000'],
            'payment_method' => ['required', 'in:Cash,GCash,Card,Bank Transfer'],
            'payment_type' => ['required', 'in:full,downpayment'],
            'amount_received' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}

