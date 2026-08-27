<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class BulkRegisterParticipantsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'participants' => ['required', 'array', 'min:1'],
            'participants.*.participant' => ['required', 'array'],
            'participants.*.participant.first_name' => ['required', 'string', 'max:100'],
            'participants.*.participant.middle_name' => ['nullable', 'string', 'max:100'],
            'participants.*.participant.last_name' => ['required', 'string', 'max:100'],
            'participants.*.participant.type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participants.*.participant.participant_type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participants.*.participant_type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participants.*.type' => ['nullable', 'string', 'in:student,child,adult,companion,guardian,teacher'],
            'participants.*.participant.student_number' => ['nullable', 'string', 'max:100'],
            'participants.*.participant.grade_level' => ['nullable', 'string', 'max:100'],
            'participants.*.participant.section' => ['nullable', 'string', 'max:100'],
            'participants.*.participant.date_of_birth' => ['nullable', 'date'],
            'participants.*.participant.email' => ['nullable', 'email:rfc', 'max:255'],
            'participants.*.participant.phone' => ['nullable', 'string', 'max:30'],
            'participants.*.participant.dietary_restrictions' => ['nullable', 'string', 'max:1000'],
            'participants.*.participant.medical_or_accessibility_notes' => ['nullable', 'string', 'max:1000'],
            'participants.*.guardian' => ['nullable', 'array'],
            'participants.*.guardian.name' => ['nullable', 'string', 'max:180'],
            'participants.*.guardian.email' => ['nullable', 'email:rfc', 'max:255'],
            'participants.*.guardian.phone' => ['nullable', 'string', 'max:30'],
            'participants.*.emergency_contact' => ['nullable', 'array'],
            'participants.*.emergency_contact.name' => ['nullable', 'string', 'max:180'],
            'participants.*.emergency_contact.phone' => ['nullable', 'string', 'max:30'],
            'participants.*.payment_plan' => ['nullable', 'string', 'in:full,down_payment,installment'],
            'participants.*.allocation_mode' => ['nullable', 'string', 'in:manual,automatic'],
            'participants.*.bus_assignment_id' => ['nullable', 'integer', 'exists:educational_tour_bus_assignments,id'],
            'participants.*.bus_sequence' => ['nullable', 'integer', 'min:1'],
            'participants.*.seat_number' => ['nullable', 'string', 'max:30'],
        ];
    }
}
