<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => [
                'required',
                'integer',
                'exists:suppliers,id',
                function ($attribute, $value, $fail) {
                    $supplier = \App\Models\Supplier::with('accreditations')->find($value);
                    if ($supplier && $supplier->accreditation_status !== 'accredited') {
                        $fail('The selected supplier must be accredited to issue a purchase order.');
                    }
                    if ($supplier && $supplier->accreditations()->where('status', 'active')->count() === 0) {
                        $fail('The selected supplier lacks an active accreditation record.');
                    }
                }
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0.01'],
            'items.*.inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
        ];
    }
}
