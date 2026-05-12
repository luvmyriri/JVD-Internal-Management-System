<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewPurchaseOrderRequest extends FormRequest
{
    /**
     * Used for both verify (Accounting) and approve (CEO/Super Admin) actions.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin', 'accounting');
    }

    public function rules(): array
    {
        return [
            'approved' => ['required', 'boolean'],
            'notes'    => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'approved.required' => 'You must specify whether the P.O. is approved or rejected.',
        ];
    }
}
