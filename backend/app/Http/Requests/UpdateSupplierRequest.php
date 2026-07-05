<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier') ? $this->route('supplier')->id : null;
        return [
            'company_name'        => ['sometimes', 'string', 'max:255', 'unique:suppliers,company_name,' . $supplierId],
            'contact_person'      => ['nullable', 'string', 'max:150'],
            'phone'               => ['nullable', 'string', 'max:30'],
            'email'               => ['nullable', 'email', 'max:255'],
            'address'             => ['nullable', 'string', 'max:500'],
            'payment_terms'       => ['nullable', 'string', 'max:500'],
            'is_consignment'      => ['sometimes', 'boolean'],
            'bank_name'           => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'tin_number'          => ['nullable', 'string', 'max:50'],
        ];
    }
}
