<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class AttachPaymentScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mode' => 'required|in:auto,manual',
            'count' => 'required_if:mode,auto|integer|min:1',
            'first_due_date' => 'required_if:mode,auto|date',
            'interval_days' => 'nullable|integer|min:1',
            'rows' => 'required_if:mode,manual|array|min:1',
            'rows.*.due_date' => 'required_with:rows|date',
            'rows.*.amount_due' => 'required_with:rows|numeric|min:0',
        ];
    }
}
