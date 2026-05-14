<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'wo_number'      => $this->wo_number,
            'status'         => $this->status,
            'priority'       => $this->priority,
            'description'    => $this->description,
            'parts_used'     => $this->parts_used,
            'cost'           => (float) $this->cost,
            'auto_generated' => (bool) $this->auto_generated,
            // Approval workflow (boss-mandated for auto-generated WOs)
            'approved_at'    => $this->approved_at?->toISOString(),
            'approval_notes' => $this->approval_notes,
            'approver'       => $this->whenLoaded('approver', fn() => [
                'id'         => $this->approver->id,
                'first_name' => $this->approver->first_name,
                'last_name'  => $this->approver->last_name,
            ]),
            'bus'            => $this->whenLoaded('bus', fn() => [
                'id'           => $this->bus->id,
                'plate_number' => $this->bus->plate_number,
                'model'        => $this->bus->model,
                'make'         => $this->bus->make ?? null,
            ]),
            'assignee'       => $this->whenLoaded('assignee', fn() => [
                'id'         => $this->assignee->id,
                'first_name' => $this->assignee->first_name,
                'last_name'  => $this->assignee->last_name,
            ]),
            'created_by'     => $this->created_by,
            'approved_by'    => $this->approved_by,
            'created_at'     => $this->created_at->toISOString(),
            'updated_at'     => $this->updated_at->toISOString(),
        ];
    }
}
