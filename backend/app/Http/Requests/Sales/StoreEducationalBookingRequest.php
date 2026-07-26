<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreEducationalBookingRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'program_id' => ['required', 'integer', 'exists:educational_tour_programs,id'], 'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'school_name' => ['required', 'string', 'max:255'], 'contact_person' => ['required', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'], 'contact_number' => ['nullable', 'string', 'max:30'],
            'grade_level' => ['required', 'string', 'max:100'], 'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'], 'pickup_location' => ['required', 'string', 'max:255'],
            'stops' => ['nullable', 'array', 'min:1', 'max:30'], 'stops.*' => ['required', 'string', 'max:255'],
            'student_count' => ['required', 'integer', 'min:1', 'max:5000'],
            'tour_guide_count' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'chaperone_count' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'assignments' => ['required', 'array', 'min:1', 'max:100'], 'assignments.*.bus_id' => ['required', 'integer', 'exists:buses,id', 'distinct'],
            'assignments.*.driver_id' => ['required', 'integer', 'exists:users,id', 'distinct'], 'assignments.*.planned_passengers' => ['required', 'integer', 'min:1'],
            'operations_notes' => ['nullable', 'string', 'max:3000'], 'payment_method' => ['required', 'in:Cash,GCash,Card,Bank Transfer'],
            'payment_type' => ['required', 'in:full,downpayment'], 'amount_received' => ['required', 'numeric', 'min:0'], 'due_date' => ['nullable', 'date'],
        ];
    }
}

