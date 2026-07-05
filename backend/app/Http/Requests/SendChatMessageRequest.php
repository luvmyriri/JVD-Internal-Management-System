<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'text'        => 'nullable|string',
            'receiver_id' => 'nullable|exists:users,id',
            'group_id'    => 'nullable|exists:chat_groups,group_id',
            'attachment'  => 'nullable|file|max:10240',
        ];
    }
}
