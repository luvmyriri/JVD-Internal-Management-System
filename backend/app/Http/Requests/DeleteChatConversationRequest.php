<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeleteChatConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sender_id' => 'nullable|exists:users,id',
            'group_id' => 'nullable|exists:chat_groups,group_id',
        ];
    }
}
