<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'jo_number'    => $this->jo_number,
            'service_type' => $this->service_type,
            'status'       => $this->status,
            'service_date' => $this->service_date?->toDateString(),
            'destination'  => $this->destination,
            'total_cost'   => (float) $this->total_cost,
            'notes'        => $this->notes,
            'customer'     => $this->whenLoaded('customer', fn() => [
                'id'         => $this->customer->id,
                'first_name' => $this->customer->first_name,
                'last_name'  => $this->customer->last_name,
                'email'      => $this->customer->email,
                'phone'      => $this->customer->phone,
            ]),
            'bus'          => $this->whenLoaded('bus', fn() => [
                'id'              => $this->bus->id,
                'plate_number'    => $this->bus->plate_number,
                'model'           => $this->bus->model,
                'seating_capacity'=> $this->bus->seating_capacity,
            ]),
            'passengers'   => $this->whenLoaded('passengers', fn() =>
                $this->passengers->map(fn($p) => [
                    'id'         => $p->id,
                    'first_name' => $p->first_name,
                    'last_name'  => $p->last_name,
                    'passport_number' => $p->passport_number,
                ])
            ),
            'legal_documents' => $this->whenLoaded('legalDocuments', fn() =>
                $this->legalDocuments->map(fn($doc) => [
                    'id'            => $doc->id,
                    'document_type' => $doc->document_type,
                    'file_path'     => $doc->file_path,
                    'status'        => $doc->status,
                    'uploaded_at'   => $doc->created_at->toISOString(),
                ])
            ),
            'created_by'   => $this->created_by,
            'driver_id'    => $this->driver_id,
            'driver'       => $this->whenLoaded('driver', fn() => [
                'id'         => $this->driver->id,
                'first_name' => $this->driver->first_name,
                'last_name'  => $this->driver->last_name,
            ]),
            'trip_ticket'  => $this->whenLoaded('tripTicket', fn() => [
                'id'            => $this->tripTicket->id,
                'ticket_number' => $this->tripTicket->ticket_number,
                'status'        => $this->tripTicket->status,
            ]),
            'purchase_order' => $this->whenLoaded('purchaseOrder', fn() => [
                'id'        => $this->purchaseOrder->id,
                'po_number' => $this->purchaseOrder->po_number,
                'status'    => $this->purchaseOrder->status,
            ]),
            'work_order'   => $this->whenLoaded('workOrder', fn() => [
                'id'        => $this->workOrder->id,
                'wo_number' => $this->workOrder->wo_number,
                'status'    => $this->workOrder->status,
            ]),
            'created_at'   => $this->created_at->toISOString(),
            'updated_at'   => $this->updated_at->toISOString(),
        ];
    }
}
