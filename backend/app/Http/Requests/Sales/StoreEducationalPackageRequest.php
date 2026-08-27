<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreEducationalPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('school') && is_array($this->school)) {
            if (isset($this->school['name'])) {
                $merge['school_name'] = $this->school['name'];
            }
            if (isset($this->school['customer_id'])) {
                $merge['school_customer_id'] = $this->school['customer_id'];
            }
            if (isset($this->school['grade_level'])) {
                $merge['grade_level'] = $this->school['grade_level'];
            }
        }

        if ($this->has('schedule') && is_array($this->schedule)) {
            if (isset($this->schedule['starts_at'])) {
                $merge['starts_at'] = $this->schedule['starts_at'];
            }
            if (isset($this->schedule['ends_at'])) {
                $merge['ends_at'] = $this->schedule['ends_at'];
            }
            if (isset($this->schedule['registration_opens_at'])) {
                $merge['registration_opens_at'] = $this->schedule['registration_opens_at'];
            }
            if (isset($this->schedule['registration_closes_at'])) {
                $merge['registration_closes_at'] = $this->schedule['registration_closes_at'];
            }
            if (isset($this->schedule['balance_due_at'])) {
                $merge['balance_due_at'] = $this->schedule['balance_due_at'];
            }
        }

        if ($this->has('pricing') && is_array($this->pricing)) {
            if (isset($this->pricing['rate_per_head'])) {
                $merge['rate_per_head'] = $this->pricing['rate_per_head'];
            }
            if (isset($this->pricing['adult_rate_per_head'])) {
                $merge['adult_rate_per_head'] = $this->pricing['adult_rate_per_head'];
            }
            if (isset($this->pricing['currency'])) {
                $merge['currency'] = $this->pricing['currency'];
            }
        }

        if ($this->has('payment_terms') && is_array($this->payment_terms)) {
            if (isset($this->payment_terms['policy'])) {
                $merge['payment_policy'] = $this->payment_terms['policy'];
            }
            if (isset($this->payment_terms['down_payment_amount'])) {
                $merge['down_payment_amount'] = $this->payment_terms['down_payment_amount'];
            }
            if (isset($this->payment_terms['installment_count'])) {
                $merge['installment_count'] = $this->payment_terms['installment_count'];
            }
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'program_id' => ['nullable', 'exists:educational_tour_programs,id'],
            'school_customer_id' => ['nullable', 'exists:customers,id'],
            'tour_code' => ['nullable', 'string', 'max:40', 'unique:educational_tour_packages,tour_code'],
            'name' => ['required', 'string', 'max:180'],
            'school_name' => ['required', 'string', 'max:180'],
            'grade_level' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:5000'],
            'learning_objectives' => ['nullable', 'string', 'max:5000'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'itinerary' => ['nullable', 'array'],
            'itinerary.*.day_number' => ['nullable', 'integer'],
            'itinerary.*.sequence' => ['nullable', 'integer'],
            'itinerary.*.date' => ['nullable', 'string'],
            'itinerary.*.starts_at' => ['nullable', 'string'],
            'itinerary.*.location' => ['nullable', 'string'],
            'itinerary.*.activity' => ['nullable', 'string'],
            'itinerary.*.activity_description' => ['nullable', 'string'],
            'itinerary.*.meal_plan' => ['nullable', 'string'],
            'itinerary.*.accommodation_name' => ['nullable', 'string'],
            'inclusions' => ['nullable', 'array'],
            'inclusions.*' => ['string', 'max:255'],
            'exclusions' => ['nullable', 'array'],
            'exclusions.*' => ['string', 'max:255'],
            'images' => ['nullable', 'array', 'max:8'],
            'images.*' => ['string', 'max:5000000'],
            'bus_assignments' => ['nullable', 'array'],
            'bus_assignments.*.bus_id' => ['required_with:bus_assignments', 'exists:buses,id'],
            'bus_assignments.*.driver_id' => ['nullable', 'exists:users,id'],
            'maximum_capacity' => ['required', 'integer', 'min:1', 'max:10000'],
            'rate_per_head' => ['required', 'numeric', 'min:0'],
            'adult_rate_per_head' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'payment_policy' => ['nullable', 'string', 'in:full_only,down_payment,installment,flexible'],
            'down_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'installment_count' => ['nullable', 'integer', 'min:2', 'max:24'],
            'balance_due_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:draft,published,registration_closed,in_progress,completed,cancelled'],
            'operations_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
