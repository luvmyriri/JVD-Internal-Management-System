<?php

namespace App\Http\Requests\Travel;

use Illuminate\Foundation\Http\FormRequest;

class StoreLegalDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'job_order_id'  => 'nullable|exists:job_orders,id',
            'title'         => 'required|string|max:255',
            'document_type' => 'required|string|max:100',
            // C-02: restrict to safe document/image types — never store client-supplied executables.
            'file'          => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', // 20MB
            'notes'         => 'nullable|string|max:1000',
        ];
    }
}
