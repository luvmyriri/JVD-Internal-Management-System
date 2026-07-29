<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEducationalBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_name' => ['required', 'string', 'max:255'],
            'contact_person' => ['required', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'grade_level' => ['required', 'string', 'max:100'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'stops' => ['nullable', 'array', 'min:1', 'max:30'],
            'stops.*' => ['required', 'string', 'max:255'],
            'booking_mode' => ['required', 'in:entire_vehicle,selected_seats'],
            'selected_seats' => ['nullable', 'array', 'max:5000'],
            'selected_seats.*' => ['required', 'string', 'max:80', 'distinct'],
            'passengers' => ['nullable', 'array', 'max:5000'],
            'passengers.*.first_name' => ['required_with:passengers', 'string', 'max:100'],
            'passengers.*.last_name' => ['required_with:passengers', 'string', 'max:100'],
            'passengers.*.role' => ['nullable', 'in:student,adult,child,tour_guide'],
            'passengers.*.seat_code' => ['nullable', 'string', 'max:80', 'distinct'],
            'passengers.*.date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'passengers.*.passport_number' => ['nullable', 'string', 'max:100'],
            'passengers.*.dietary_restrictions' => ['nullable', 'string', 'max:255'],
            'passengers.*.emergency_contact' => ['nullable', 'string', 'max:255'],
            'passengers.*.special_needs' => ['nullable', 'string', 'max:1000'],
            'assignments' => ['required', 'array', 'min:1', 'max:100'],
            'assignments.*.bus_id' => ['required', 'integer', 'exists:buses,id', 'distinct'],
            'assignments.*.driver_id' => ['required', 'integer', 'exists:users,id', 'distinct'],
            'assignments.*.planned_passengers' => ['required', 'integer', 'min:1'],
            'operations_notes' => ['nullable', 'string', 'max:3000'],
        ];
    }
}
