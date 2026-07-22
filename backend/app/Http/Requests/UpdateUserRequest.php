<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-\s]+$/'],
            'role' => ['sometimes', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department' => ['nullable', 'string', 'max:100'],
            'custom_permissions' => ['nullable', 'array'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
        ];
    }
}
