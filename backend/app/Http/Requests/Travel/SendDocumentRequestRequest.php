<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class SendDocumentRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'requested_docs'   => ['required', 'array'],
            'requested_docs.*' => ['required', 'string'],
        ];
    }
}
