<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();
        $role = $this->input('role');

        return $actor !== null
            && is_string($role)
            && $actor->can('createWithRole', [User::class, $role]);
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
            'send_invitation' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
        ];
    }
}
