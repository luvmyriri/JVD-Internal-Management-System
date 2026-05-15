<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only super_admin and admin can create accounts
        return $this->user()->hasRole('super_admin', 'admin');
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'string', 'unique:users,employee_id'],
            'email' => ['required', 'email', 'unique:users,email'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'in:admin,human_resource,accounting,agent,driver'],
            'department' => ['nullable', 'string', 'max:100'],
        ];
    }
}
