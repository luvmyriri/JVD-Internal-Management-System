<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PassportCaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'case_type'        => $this->case_type,
            'status'           => $this->status,
            'reference_number' => $this->reference_number,
            'checklist'        => $this->checklist,
            'submitted_date'   => $this->submitted_date?->toDateString(),
            'release_date'     => $this->release_date?->toDateString(),
            'customer'         => $this->whenLoaded('customer', fn() => [
                'id'        => $this->customer->id,
                'full_name' => "{$this->customer->first_name} {$this->customer->last_name}",
            ]),
            'passenger'        => $this->whenLoaded('passenger', fn() => [
                'id'          => $this->passenger->id,
                'full_name'   => "{$this->passenger->first_name} {$this->passenger->last_name}",
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
