<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PassportCaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $billedInvoiceId = $this->billedInvoiceItem?->invoice_id
            ?? $this->billedTransaction?->invoice_id;

        return [
            'id'                  => $this->id,
            'case_type'           => $this->case_type,
            'destination_country' => $this->destination_country,
            'visa_type'           => $this->visa_type,
            'status'              => $this->status,
            'reference_number'    => $this->reference_number,
            'checklist'           => $this->checklist,
            'is_billed'           => $billedInvoiceId !== null,
            'billed_invoice_id'   => $billedInvoiceId,
            'submitted_date'   => $this->submitted_date?->toDateString(),
            'release_date'     => $this->release_date?->toDateString(),
            'customer'         => $this->whenLoaded('customer', fn() => [
                'id'          => $this->customer->id,
                'first_name'  => $this->customer->first_name,
                'middle_name' => $this->customer->middle_name,
                'last_name'   => $this->customer->last_name,
                'suffix'      => $this->customer->suffix,
                'email'       => $this->customer->email,
                'phone'       => $this->customer->phone,
                'address'     => $this->customer->address,
                'full_name'   => collect([$this->customer->first_name, $this->customer->middle_name, $this->customer->last_name, $this->customer->suffix])->filter()->join(' '),
            ]),
            'passenger'        => $this->whenLoaded('passenger', fn() => [
                'id'          => $this->passenger->id,
                'first_name'  => $this->passenger->first_name,
                'middle_name' => $this->passenger->middle_name,
                'last_name'   => $this->passenger->last_name,
                'suffix'      => $this->passenger->suffix,
                'birth_date'  => $this->passenger->birth_date?->toDateString(),
                'contact_no'  => $this->passenger->contact_no,
                'full_name'   => collect([$this->passenger->first_name, $this->passenger->middle_name, $this->passenger->last_name, $this->passenger->suffix])->filter()->join(' '),
                'passport_no' => $this->passenger->passport_no,
            ]),
            'handler'          => $this->whenLoaded('handler', fn() => [
                'id'        => $this->handler->id,
                'full_name' => "{$this->handler->first_name} {$this->handler->last_name}",
            ]),
            'created_at'       => $this->created_at->toISOString(),
            'updated_at'       => $this->updated_at->toISOString(),
        ];
    }
}
