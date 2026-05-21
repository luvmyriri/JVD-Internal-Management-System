<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into the API response shape.
     * Never return raw models — always use API Resources (Dev Guide § 5.2).
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'email' => $this->email,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'avatar_url' => $this->avatar_url ? (str_starts_with($this->avatar_url, 'http') ? $this->avatar_url : asset($this->avatar_url)) : null,
            'role' => $this->role,
            'department' => $this->department,
            'is_active' => $this->is_active,
            'is_online' => \Illuminate\Support\Facades\Cache::has('user-is-online-' . $this->id),
            'must_change_password' => $this->must_change_password,
            'last_login' => $this->last_login?->toISOString(),
            'custom_permissions' => $this->custom_permissions,
            'effective_permissions' => $this->getAllPermissions(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
