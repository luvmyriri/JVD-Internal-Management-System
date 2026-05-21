<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    /**
     * Only agents, admins, and super admins can create PO drafts.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('super_admin', 'admin', 'accounting', 'agent');
    }

    public function rules(): array
    {
        return [
            'supplier_id'          => [
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
            'notes'                => ['nullable', 'string', 'max:1000'],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.item_name'    => ['required', 'string', 'max:255'],
            'items.*.description'  => ['nullable', 'string', 'max:500'],
            'items.*.quantity'     => ['required', 'integer', 'min:1'],
            'items.*.unit_price'   => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.exists'        => 'The selected supplier does not exist.',
            'items.required'            => 'A Purchase Order must have at least one line item.',
            'items.*.item_name.required'=> 'Each line item must have a name.',
            'items.*.quantity.min'      => 'Quantity must be at least 1.',
            'items.*.unit_price.min'    => 'Unit price cannot be negative.',
        ];
    }
}
