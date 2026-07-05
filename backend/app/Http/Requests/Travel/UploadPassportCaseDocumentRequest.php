<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class UploadPassportCaseDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            // C-01: restrict to safe document/image types — never store client-supplied executables.
            'file'  => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'], // Max 10MB
        ];
    }
}
