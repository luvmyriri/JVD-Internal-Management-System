<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContractDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'terms_snapshot' => 'sometimes|string',
            'deposit_required_percent' => 'sometimes|nullable|numeric',
            'deposit_required_amount' => 'sometimes|nullable|numeric',
            'cancellation_policy_key' => 'sometimes|nullable|string',
        ];
    }
}
