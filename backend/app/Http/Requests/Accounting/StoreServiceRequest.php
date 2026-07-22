<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class StoreServiceRequest extends FormRequest
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
            'service_type' => 'nullable|string|in:bus_rental,private_tour,joiner_tour,educational_tour,visa_assistance,passport_assistance,flight_booking,accommodation_booking,ticket_booking,activity_booking,transfer_service,custom_arrangement',
            'package_config' => 'required_if:service_type,private_tour|nullable|array',
            'package_config.destination' => 'required_if:service_type,private_tour|nullable|string|max:160',
            'package_config.origin' => 'nullable|string|max:160',
            'package_config.duration_days' => 'required_if:service_type,private_tour|nullable|integer|min:1|max:365',
            'package_config.duration_nights' => 'nullable|integer|min:0|max:364',
            'package_config.minimum_pax' => 'required_if:service_type,private_tour|nullable|integer|min:1|max:500',
            'package_config.maximum_pax' => 'required_if:service_type,private_tour|nullable|integer|min:1|max:500|gte:package_config.minimum_pax',
            'package_config.booking_lead_days' => 'nullable|integer|min:0|max:365',
            'package_config.valid_from' => 'nullable|date',
            'package_config.valid_until' => 'nullable|date|after_or_equal:package_config.valid_from',
            'package_config.default_itinerary' => 'required_if:service_type,private_tour|nullable|array',
            'package_config.default_itinerary.*' => 'required|string|max:1000',
            'is_sales_catalog' => 'nullable|boolean',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string', // Base64 strings
            'child_discount' => 'nullable|numeric|min:0|max:100',
            'has_booking_fields' => 'nullable|boolean',
            'adult_price' => 'required_if:service_type,private_tour,joiner_tour|nullable|numeric|min:0',
            'child_price' => 'required_if:service_type,private_tour,joiner_tour|nullable|numeric|min:0',
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
            'bus_id' => 'nullable|integer|exists:buses,id',
            'driver_id' => 'nullable|integer|exists:users,id',
        ];
    }
}
