<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'employee_id',
        'email',
        'password',
        'first_name',
        'last_name',
        'avatar_url',
        'role',
        'department',
        'custom_permissions',
        'totp_secret',
        'is_active',
        'last_login',
        'created_by',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'totp_secret',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'custom_permissions' => 'array',
        ];
    }

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedBus()
    {
        return $this->hasOne(Bus::class, 'assigned_driver');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function driverDocuments()
    {
        return $this->hasMany(ProcurementDocument::class, 'driver_id');
    }

    public function uploadedDocuments()
    {
        return $this->hasMany(ProcurementDocument::class, 'uploaded_by');
    }

    // ──────────────────────────────────────────
    // Role helpers
    // ──────────────────────────────────────────

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function hasRole(string ...$roles): bool
    {
        $groups = [
            'super_admin'          => ['super_admin'],
            'admin'                => ['super_admin', 'admin', 'operations_manager', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic'],
            'human_resource'       => ['human_resource', 'corporate_secretary'],
            'accounting'           => ['accounting', 'accounting_executive'],
            'agent'                => ['agent', 'reservation_officer', 'office_staff'],
            'driver'               => ['driver'],
        ];

        foreach ($roles as $role) {
            if ($this->role === $role) {
                return true;
            }
            if (isset($groups[$role]) && in_array($this->role, $groups[$role])) {
                return true;
            }
        }

        return false;
    }

    public function getAllPermissions(): array
    {
        $rolePermissions = RolePermission::getForRole($this->role);
        $custom = $this->custom_permissions ?? [];

        // If no custom permissions, just return role permissions
        if (empty($custom)) {
            return $rolePermissions;
        }

        // Merge custom permissions overriding role permissions
        // Loop through custom permissions and override the boolean flags
        foreach ($custom as $module => $actions) {
            if (!isset($rolePermissions[$module])) {
                $rolePermissions[$module] = [
                    'can_view' => false,
                    'can_create' => false,
                    'can_edit' => false,
                    'can_delete' => false,
                ];
            }
            foreach ($actions as $action => $value) {
                $rolePermissions[$module][$action] = (bool) $value;
            }
        }

        return $rolePermissions;
    }
}
