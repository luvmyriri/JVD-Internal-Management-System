<?php

namespace App\Http\Requests\Accounting;

use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransactionIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        $invoice = $this->route('invoice');
        $kind = $invoice instanceof Invoice && $this->isInternalInvoice($invoice)
            ? 'cash_budget_disbursement'
            : $this->query('kind', 'sales');

        if (! in_array($kind, ['cash_budget_disbursement', 'all'], true)) {
            return true;
        }

        $user = $this->user();

        return $user !== null
            && (in_array($user->role, [
                'super_admin',
                'executive_vice_president',
                'accounting_executive',
            ], true) || $user->hasPermission('accounting', 'view'));
    }

    protected function prepareForValidation(): void
    {
        $invoice = $this->route('invoice');
        $defaultKind = $invoice instanceof Invoice && $this->isInternalInvoice($invoice)
            ? 'cash_budget_disbursement'
            : 'sales';

        $this->merge([
            'kind' => $this->query('kind', $defaultKind),
            'per_page' => $this->query('per_page', 20),
        ]);
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:160'],
            'status' => ['nullable', Rule::in([
                'pending', 'pending_payment', 'partial', 'paid', 'cancelled',
                'voided', 'issued', 'disbursed_budget',
            ])],
            'payment_state' => ['nullable', Rule::in(['unpaid', 'partial', 'paid', 'refunded', 'overdue'])],
            'service_type' => ['nullable', Rule::in(array_keys(config('service_types', [])))],
            'payment_method' => ['nullable', 'string', 'max:80'],
            'payment_type' => ['nullable', Rule::in(['full', 'downpayment', 'partial'])],
            'collection_status' => ['nullable', Rule::in(['pending', 'partial', 'overdue', 'completed'])],
            'contract_status' => ['nullable', Rule::in([
                'not_required', 'required', 'draft', 'sent_for_signature',
                'signed', 'declined', 'voided', 'expired',
            ])],
            'date_from' => ['nullable', 'date'],
            'date_to' => [
                'nullable',
                'date',
                Rule::when($this->filled('date_from'), ['after_or_equal:date_from']),
            ],
            'kind' => ['required', Rule::in(['sales', 'cash_budget_disbursement', 'all'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    private function isInternalInvoice(Invoice $invoice): bool
    {
        return $invoice->cash_budget_request_id !== null || $invoice->status === 'disbursed_budget';
    }
}
