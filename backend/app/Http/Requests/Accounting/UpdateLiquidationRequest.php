<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLiquidationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'total_advanced' => 'sometimes|numeric|min:0',
            'notes'          => 'nullable|string',
            'status'         => 'sometimes|in:pending,under_review,disputed',
        ];
    }
}
