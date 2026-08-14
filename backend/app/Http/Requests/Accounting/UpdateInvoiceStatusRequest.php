<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // This endpoint only reconciles display state to posted payment evidence.
            // Voids, cancellations, refunds, and budget disbursements have dedicated flows.
            'status' => 'required|in:pending_payment,partial,paid',
        ];
    }
}
