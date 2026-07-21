<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'child_discount' => 'nullable|numeric|min:0|max:100',
            'has_booking_fields' => 'nullable|boolean',
            'adult_price' => 'nullable|numeric|min:0',
            'child_price' => 'nullable|numeric|min:0',
            'is_tour' => 'nullable|boolean',
            'bus_price' => 'nullable|numeric|min:0',
            'coaster_price' => 'nullable|numeric|min:0',
            'tour_kms' => 'nullable|integer|min:0',
            'tour_hours' => 'nullable|integer|min:0',
            'cost_breakdown' => 'nullable|string',
            'inclusions' => 'nullable|string',
            'exclusions' => 'nullable|string',
            'max_pax' => 'nullable|integer|min:1',
            'fixed_date' => 'nullable|date',
            'fixed_departure_time' => 'nullable|string|max:20',
            'fixed_arrival_datetime' => 'nullable|string|max:30',
        ];
    }
}
