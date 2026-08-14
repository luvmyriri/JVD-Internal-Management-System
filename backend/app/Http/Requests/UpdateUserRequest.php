<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();
        $target = $this->route('user');

        if (! $actor || ! $target instanceof User || ! $actor->can('update', $target)) {
            return false;
        }

        if ($this->has('role')) {
            $role = $this->input('role');

            return is_string($role) && $actor->can('assignRole', [$target, $role]);
        }

        return true;
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $userId = $user instanceof \App\Models\User ? $user->id : $user;

        return [
            'employee_id' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'employee_id')->ignore($userId)],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-\s]+$/'],
            'role' => ['sometimes', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department' => ['nullable', 'string', 'max:100'],
            'custom_permissions' => ['nullable', 'array'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'dashboard_preference' => ['nullable', 'string', 'in:admin,accounting,operations,logistics,procurement,maintenance,hr,agent,driver'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
        ];
    }
}
