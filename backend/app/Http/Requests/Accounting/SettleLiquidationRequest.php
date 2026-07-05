<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class SettleLiquidationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array',
            'items.*.expense_category' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0',
            'total_returned' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ];
    }
}
