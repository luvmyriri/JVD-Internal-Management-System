<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_name'     => ['required', 'string', 'max:255'],
            'category'      => ['required', 'string', 'max:100'],
            'quantity'      => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit'          => ['required', 'string', 'max:30'],
            'unit_cost'     => ['required', 'numeric', 'min:0'],
        ];
    }
}
