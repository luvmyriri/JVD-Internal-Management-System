<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'destination' => ['sometimes', 'string', 'max:255'],
            'service_date'=> ['sometimes', 'date'],
            'total_cost'  => ['sometimes', 'numeric', 'min:0'],
            'notes'       => ['nullable', 'string', 'max:1000'],
            'status'      => ['nullable', 'string'],
        ];
    }
}
