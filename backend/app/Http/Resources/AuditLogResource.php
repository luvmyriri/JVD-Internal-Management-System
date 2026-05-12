<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'action'      => $this->action,
            'module'      => $this->module,
            'entity_type' => $this->entity_type,
            'entity_id'   => $this->entity_id,
            'old_values'  => $this->old_values,
            'new_values'  => $this->new_values,
            'ip_address'  => $this->ip_address,
            'performed_by'=> $this->whenLoaded('user', fn() => [
                'id'          => $this->user->id,
                'employee_id' => $this->user->employee_id,
                'first_name'  => $this->user->first_name,
                'last_name'   => $this->user->last_name,
                'role'        => $this->user->role,
            ]),
            'created_at'  => $this->created_at->toISOString(),
        ];
    }
}
