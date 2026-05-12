<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin', 'agent');
    }

    public function rules(): array
    {
        return [
            'bus_id'      => ['required', 'integer', 'exists:buses,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'priority'    => ['required', 'in:low,medium,high,critical'],
            'description' => ['required', 'string', 'max:2000'],
            'parts_used'  => ['nullable', 'string', 'max:1000'],
            'cost'        => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
