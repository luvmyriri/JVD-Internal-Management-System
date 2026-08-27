<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class RegisterParticipantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'participant' => ['required', 'array'],
            'participant.first_name' => ['required', 'string', 'max:100'],
            'participant.middle_name' => ['nullable', 'string', 'max:100'],
            'participant.last_name' => ['required', 'string', 'max:100'],
            'participant.type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participant.participant_type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participant_type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participant.student_number' => ['nullable', 'string', 'max:100'],
            'participant.grade_level' => ['nullable', 'string', 'max:100'],
            'participant.section' => ['nullable', 'string', 'max:100'],
            'participant.date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'participant.email' => ['nullable', 'email:rfc', 'max:255'],
            'participant.phone' => ['nullable', 'string', 'max:30'],
            'participant.dietary_restrictions' => ['nullable', 'string', 'max:1000'],
            'participant.medical_or_accessibility_notes' => ['nullable', 'string', 'max:1000'],
            'guardian' => ['nullable', 'array'],
            'guardian.name' => ['nullable', 'string', 'max:180'],
            'guardian.email' => ['nullable', 'email:rfc', 'max:255'],
            'guardian.phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.name' => ['nullable', 'string', 'max:180'],
            'emergency_contact.phone' => ['nullable', 'string', 'max:30'],
            'payment_plan' => ['nullable', 'string', 'in:full,down_payment,installment'],
            'allocation_mode' => ['nullable', 'string', 'in:manual,automatic'],
            'bus_assignment_id' => ['nullable', 'integer', 'exists:educational_tour_bus_assignments,id'],
            'seat_number' => ['nullable', 'string', 'max:30'],
            'participant.allocation_mode' => ['nullable', 'string', 'in:manual,automatic'],
            'participant.bus_assignment_id' => ['nullable', 'integer', 'exists:educational_tour_bus_assignments,id'],
            'participant.seat_number' => ['nullable', 'string', 'max:30'],
        ];
    }
}
