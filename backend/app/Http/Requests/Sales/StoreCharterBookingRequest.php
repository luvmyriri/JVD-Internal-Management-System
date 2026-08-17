<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharterBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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
            'passenger_count' => ['required', 'integer', 'min:1', 'max:5000'],
            'booking_mode' => ['nullable', 'in:entire_vehicle,selected_seats'],
            'selected_seats' => ['nullable', 'array', 'max:100'],
            'selected_seats.*' => ['required', 'string', 'max:50', 'distinct'],
            'passengers' => ['nullable', 'array', 'max:100'],
            'passengers.*.first_name' => ['required_with:passengers', 'string', 'max:100'],
            'passengers.*.last_name' => ['required_with:passengers', 'string', 'max:100'],
            'passengers.*.role' => ['nullable', 'in:student,adult,child,tour_guide'],
            'passengers.*.seat_code' => ['nullable', 'string', 'max:50', 'distinct'],
            'passengers.*.date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'passengers.*.passport_number' => ['nullable', 'string', 'max:100'],
            'passengers.*.dietary_restrictions' => ['nullable', 'string', 'max:255'],
            'passengers.*.emergency_contact' => ['nullable', 'string', 'max:255'],
            'passengers.*.special_needs' => ['nullable', 'string', 'max:1000'],
            'estimated_kilometers' => ['required', 'numeric', 'min:0', 'max:10000'],
            'is_fixed_rate' => ['nullable', 'boolean'],
            'operations_notes' => ['nullable', 'string', 'max:2000'],
            'payment_method' => ['required', 'in:Cash,GCash,Card,Bank Transfer'],
            'payment_type' => ['required', 'in:full,downpayment'],
            'amount_received' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
