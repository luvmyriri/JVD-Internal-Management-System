<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_address' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|email|max:255',
            'customer_contact' => ['nullable', 'string', 'regex:/^(09|\+639|639)\d{9}$/'],
            'payment_method' => 'required|string',
            'payment_type' => 'nullable|string|in:full,downpayment',
            'due_date' => 'nullable|date',
            'travel_date' => 'nullable|date',
            'arrival_datetime' => 'nullable|date',
            'departure_datetime' => 'nullable|date',
            'pickup_location' => 'nullable|string|max:255',
            'tour_code' => 'nullable|string|max:255',
            'pax_count' => 'nullable|integer|min:1',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.adults' => 'nullable|integer',
            'items.*.children' => 'nullable|integer',
            'items.*.service_date' => 'nullable|date',
            'items.*.destination' => 'nullable|string',
            'notes' => 'nullable|string',
            'bus_id' => 'nullable|integer|exists:buses,id',
            'driver_id' => 'nullable|integer|exists:users,id',
            'seat_map' => 'nullable|array',
            'tax_rate' => 'nullable|numeric|min:0|max:1',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_contact.regex' => 'The contact number must be a valid Philippine mobile number.',
            'customer_email.email' => 'The email address must be a valid email format.',
        ];
    }
}
