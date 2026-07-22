<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharterRatePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'name' => ['required', 'string', 'max:150'],
            'vehicle_class' => ['required', 'in:bus,van,coaster'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'included_hours' => ['required', 'integer', 'min:1', 'max:168'],
            'included_kilometers' => ['required', 'integer', 'min:0', 'max:10000'],
            'extra_hour_rate' => ['required', 'numeric', 'min:0'],
            'extra_kilometer_rate' => ['required', 'numeric', 'min:0'],
            'overnight_rate' => ['required', 'numeric', 'min:0'],
            'includes_driver' => ['required', 'boolean'],
            'includes_fuel' => ['required', 'boolean'],
            'includes_tolls' => ['required', 'boolean'],
            'includes_parking' => ['required', 'boolean'],
        ];
    }
}

