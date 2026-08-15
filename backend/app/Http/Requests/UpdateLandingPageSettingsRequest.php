<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'logo_file' => 'nullable|file',
            'bg_files' => 'nullable|array',
            'bg_files.*' => 'file',
            'existing_bg_urls' => 'nullable|array',
            'existing_bg_urls.*' => 'string',
            'landing_page_btn_color' => 'nullable|string|regex:/^#[0-9a-fA-F]{6}$/',
            'landing_page_slide_duration' => 'nullable|integer|min:2|max:60',
            'landing_page_title' => 'nullable|string|max:100',
            'landing_page_slide_transition' => 'nullable|string|in:fade,slide,zoom,none',
            'existing_documents' => 'nullable', // JSON string or array of retained documents
            'new_document_files' => 'nullable|array',
            'new_document_files.*' => 'file',
            'new_document_titles' => 'nullable|array',
            'new_document_titles.*' => 'string|max:255',
            'new_document_descriptions' => 'nullable|array',
            'new_document_descriptions.*' => 'nullable|string|max:1000',
        ];
    }
}
