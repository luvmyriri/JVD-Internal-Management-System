<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class StoreLiquidationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'trip_ticket_id'    => 'nullable|exists:trip_tickets,id',
            'work_order_id'     => 'nullable|exists:work_orders,id',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            'employee_id'       => 'required|exists:users,id',
            'total_advanced'    => 'required|numeric|min:0',
            'notes'             => 'nullable|string',
        ];
    }
}
