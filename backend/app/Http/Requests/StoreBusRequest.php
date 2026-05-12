<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin');
    }

    public function rules(): array
    {
        return [
            'plate_number'     => ['required', 'string', 'max:20', 'unique:buses,plate_number'],
            'model'            => ['required', 'string', 'max:150'],
            'seating_capacity' => ['required', 'integer', 'min:1', 'max:120'],
            'status'           => ['sometimes', 'in:available,in_service,under_maintenance,decommissioned'],
            'total_mileage'    => ['nullable', 'numeric', 'min:0'],
            'assigned_driver'  => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'plate_number.unique' => 'A bus with this plate number already exists.',
        ];
    }
}
