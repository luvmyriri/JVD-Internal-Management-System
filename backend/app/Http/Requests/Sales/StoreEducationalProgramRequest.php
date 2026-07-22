<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreEducationalProgramRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'learning_objectives' => ['nullable', 'string', 'max:5000'], 'default_stops' => ['required', 'array', 'min:1', 'max:30'],
            'default_stops.*' => ['required', 'string', 'max:255'], 'minimum_students' => ['required', 'integer', 'min:1', 'max:5000'],
            'students_per_chaperone' => ['required', 'integer', 'min:1', 'max:100'], 'students_per_free_chaperone' => ['required', 'integer', 'min:1', 'max:100'],
            'student_price' => ['required', 'numeric', 'min:0'], 'additional_chaperone_price' => ['required', 'numeric', 'min:0'],
            'includes_meals' => ['required', 'boolean'], 'includes_coordinator' => ['required', 'boolean'],
            'includes_insurance' => ['required', 'boolean'], 'includes_shirt' => ['required', 'boolean'],
        ];
    }
}
