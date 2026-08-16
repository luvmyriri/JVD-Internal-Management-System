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
        'phone',
        'password',
        'first_name',
        'last_name',
        'avatar_url',
        'role',
        'department',
        'custom_permissions',
        'custom_abilities',
        'tags',
        'dashboard_preference',
        'totp_secret',
        'is_active',
        'last_login',
        'created_by',
        'must_change_password',
        'two_factor_verified_at',
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
            'two_factor_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'custom_permissions' => 'array',
            'custom_abilities' => 'array',
            'tags' => 'array',
            'totp_secret' => 'encrypted',
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

    public function liquidations()
    {
        return $this->hasMany(Liquidation::class, 'employee_id');
    }

    public function salary()
    {
        return $this->hasOne(EmployeeSalary::class);
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
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
        return $this->role === 'super_admin';
    }

    public function isExecutiveVP(): bool
    {
        return $this->role === 'executive_vice_president';
    }

    /**
     * Check if the user has one of the given role(s).
     * Each role is matched exactly — no group expansion.
     * Super admin always passes.
     */
    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Check if the user has a specific permission on a module.
     * Super admin always passes.
     */
    public function hasPermission(string $module, string $action = 'view'): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        $actionKey = 'can_' . $action;
        $permissions = $this->getAllPermissions();

        return isset($permissions[$module][$actionKey]) && $permissions[$module][$actionKey] === true;
    }

    public function getAllPermissions(): array
    {
        $rolePermissions = RolePermission::getForRole($this->role);
        $custom = $this->custom_permissions ?? [];
        if (is_string($custom)) {
            $custom = json_decode($custom, true) ?: [];
        }

        // If no custom permissions, just return role permissions
        if (empty($custom) || !is_array($custom)) {
            return $rolePermissions;
        }

        // Merge custom permissions overriding role permissions
        // Loop through custom permissions and override the boolean flags
        foreach ($custom as $module => $actions) {
            if (!is_array($actions)) {
                continue;
            }
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

    // ──────────────────────────────────────────
    // Abilities (named verbs beyond CRUD — roadmap 2.3)
    // ──────────────────────────────────────────

    /**
     * Check a named ability (e.g. "cash_budgets.approve_accounting").
     * Resolution order: super_admin bypass → per-user revoke → per-user grant → role grant.
     */
    public function hasAbility(string $ability): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        $custom = $this->custom_abilities ?? [];
        if (in_array($ability, $custom['revoke'] ?? [], true)) {
            return false;
        }
        if (in_array($ability, $custom['grant'] ?? [], true)) {
            return true;
        }

        return RoleAbility::roleHasAbility($this->role, $ability);
    }

    /**
     * The user's effective ability set (role grants + per-user grants − per-user revokes).
     *
     * @return string[]
     */
    public function abilities(): array
    {
        if ($this->role === 'super_admin') {
            return array_keys(RoleAbility::ABILITIES);
        }

        $custom = $this->custom_abilities ?? [];
        $set = array_diff(RoleAbility::getForRole($this->role), $custom['revoke'] ?? []);

        return array_values(array_unique(array_merge($set, $custom['grant'] ?? [])));
    }

    /**
     * Query scope: users who effectively hold a given ability. Used by the workflow
     * engine / notifications to answer "who can act" without looping every user in PHP.
     * (Per-user overrides are JSON, so we resolve those in PHP after the role-level filter.)
     */
    public static function withAbility(string $ability)
    {
        $roles = RoleAbility::where('ability', $ability)->pluck('role')->all();
        $roles[] = 'super_admin';

        return self::query()
            ->where('is_active', true)
            ->where(function ($q) use ($roles, $ability) {
                $q->whereIn('role', $roles)
                  ->orWhereJsonContains('custom_abilities->grant', $ability);
            })
            ->get()
            ->filter(fn (User $u) => $u->hasAbility($ability))
            ->values();
    }

    public function hasTag(string $tag): bool
    {
        return in_array($tag, $this->tags ?? []);
    }

    public function hasAnyTag(array $tags): bool
    {
        return count(array_intersect($tags, $this->tags ?? [])) > 0;
    }

    /**
     * Resolve all active users authorized for an approval workflow based on:
     * 1. Hardcoded domain default roles (super_admin and executive_vice_president always included)
     * 2. Tag attributes (e.g. 'process:approve_budget', 'process:approve_procurement', 'process:approve_maintenance')
     * 3. Custom abilities granted per user
     */
    public static function getApprovers(string $tagOrAbility, array $defaultRoles = []): \Illuminate\Database\Eloquent\Collection
    {
        $roles = array_unique(array_merge(['super_admin', 'executive_vice_president'], $defaultRoles));

        return self::query()
            ->where('is_active', true)
            ->where(function ($q) use ($tagOrAbility, $roles) {
                $q->whereIn('role', $roles)
                  ->orWhereJsonContains('tags', $tagOrAbility)
                  ->orWhereJsonContains('custom_abilities->grant', $tagOrAbility);
            })
            ->get();
    }
}
