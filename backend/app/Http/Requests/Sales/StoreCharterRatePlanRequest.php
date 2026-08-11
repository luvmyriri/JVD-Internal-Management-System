<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreCharterRatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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
            'garage_location' => ['nullable', 'string', 'max:255'],
            'pickup_location' => ['nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'garage_distance_km' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'route_distance_km' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'total_distance_km' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'fuel_efficiency_km_per_liter' => ['nullable', 'numeric', 'gt:0', 'max:100'],
            'estimated_liters' => ['nullable', 'numeric', 'min:0'],
            'diesel_price_per_liter' => ['nullable', 'numeric', 'min:0'],
            'diesel_cost' => ['nullable', 'numeric', 'min:0'],
            'driver_meals' => ['nullable', 'numeric', 'min:0'],
            'toll_gate_fees' => ['nullable', 'numeric', 'min:0'],
            'easytrip' => ['nullable', 'numeric', 'min:0'],
            'autosweep' => ['nullable', 'numeric', 'min:0'],
            'commission' => ['nullable', 'numeric', 'min:0'],
            'desired_profit' => ['nullable', 'numeric', 'min:0'],
            'auto_adjust_rate' => ['nullable', 'boolean'],
            'pricing_metadata' => ['nullable', 'array'],
        ];
    }
}
