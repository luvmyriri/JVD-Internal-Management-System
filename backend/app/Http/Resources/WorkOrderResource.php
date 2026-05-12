<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'wo_number'    => $this->wo_number,
            'status'       => $this->status,
            'priority'     => $this->priority,
            'description'  => $this->description,
            'parts_used'   => $this->parts_used,
            'cost'         => (float) $this->cost,
            'auto_generated'=> $this->auto_generated,
            'bus'          => $this->whenLoaded('bus', fn() => [
                'id'           => $this->bus->id,
                'plate_number' => $this->bus->plate_number,
                'model'        => $this->bus->model,
            ]),
            'assignee'     => $this->whenLoaded('assignee', fn() => [
                'id'         => $this->assignee->id,
                'first_name' => $this->assignee->first_name,
                'last_name'  => $this->assignee->last_name,
            ]),
            'created_by'   => $this->created_by,
            'created_at'   => $this->created_at->toISOString(),
            'updated_at'   => $this->updated_at->toISOString(),
        ];
    }
}
