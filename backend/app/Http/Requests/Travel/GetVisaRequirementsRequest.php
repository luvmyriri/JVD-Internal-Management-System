<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class GetVisaRequirementsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'passport'    => ['nullable', 'string', 'max:5'],
            'destination' => ['required', 'string', 'max:5'],
        ];
    }
}
