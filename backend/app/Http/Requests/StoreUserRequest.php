<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only users with admin create permission can create accounts
        if (!$this->user()->hasPermission('admin', 'create')) {
            return false;
        }

        // Only super_admin can create another super_admin
        if ($this->input('role') === 'super_admin' && $this->user()->role !== 'super_admin') {
            return false;
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['nullable', 'string', 'unique:users,employee_id'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-\s]+$/'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department' => ['nullable', 'string', 'max:100'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
        ];
    }
}
