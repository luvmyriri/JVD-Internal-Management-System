<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJoinerDepartureRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'code' => ['nullable', 'string', 'max:100', Rule::unique('joiner_departures', 'code')],
            'starts_at' => ['required', 'date', 'after:now'],

            'ends_at' => ['required', 'date', 'after:starts_at'],
            'booking_cutoff_at' => ['required', 'date', 'before:starts_at'],
            'timezone' => ['nullable', 'timezone'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'seat_codes' => ['nullable', 'array'],
            'seat_codes.*' => ['required', 'string', 'max:20', 'distinct'],
            'bus_id' => ['nullable', 'integer', Rule::exists('buses', 'id')->where(fn ($query) => $query->where('status', 'available'))],
            'driver_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'driver')->where('is_active', true))],
            'pickup_instructions' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published,closed,cancelled,departed,completed'],
        ];
    }
}
