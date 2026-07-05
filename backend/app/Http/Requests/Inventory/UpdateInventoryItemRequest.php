<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_name'     => ['sometimes', 'string', 'max:255'],
            'category'      => ['sometimes', 'string', 'max:100'],
            'quantity'      => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit'          => ['sometimes', 'string', 'max:30'],
            'unit_cost'     => ['sometimes', 'numeric', 'min:0'],
        ];
    }
}
