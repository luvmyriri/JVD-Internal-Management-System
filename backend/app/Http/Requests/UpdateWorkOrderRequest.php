<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bus_id'     => ['sometimes', 'integer', 'exists:buses,id'],
            'assigned_to'=> ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'priority'   => ['sometimes', 'in:routine,urgent,critical'],
            'description'=> ['sometimes', 'string', 'max:2000'],
            'parts_used' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'cost'       => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }
}
