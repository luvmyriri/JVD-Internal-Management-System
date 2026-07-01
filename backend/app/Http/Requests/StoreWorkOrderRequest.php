<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user->hasPermission('procurement', 'create') ||
               $user->hasRole('driver', 'head_mechanic', 'service_adviser', 'dispatcher', 'logistics_in_charge', 'super_admin', 'executive_vice_president');
    }

    public function rules(): array
    {
        return [
            'bus_id'      => ['required', 'integer', 'exists:buses,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'priority'    => ['required', 'in:routine,urgent,critical'],
            'description' => ['required', 'string', 'max:2000'],
            'parts_used'  => ['nullable', 'string', 'max:1000'],
            'cost'        => ['nullable', 'numeric', 'min:0'],
            'type'        => ['nullable', 'in:maintenance,trip'],
            'is_override' => ['nullable', 'boolean'],
        ];
    }
}
