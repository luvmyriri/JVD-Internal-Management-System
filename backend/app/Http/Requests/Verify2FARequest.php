<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class Verify2FARequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
<<<<<<< HEAD
=======
            'secret' => ['sometimes', 'required', 'string'],
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe
        ];
    }

    public function messages(): array
    {
        return [
            'code.size' => 'The verification code must be exactly 6 digits.',
            'code.regex' => 'The verification code must contain only numbers.',
        ];
    }
}
