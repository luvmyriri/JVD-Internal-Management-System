<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /** Roles delegated HR operators may provision and manage. */
    private const OPERATIONAL_STAFF_ROLES = [
        'driver',
        'reservation_officer',
        'office_staff',
        'logistics_in_charge',
        'dispatcher',
        'service_adviser',
        'head_mechanic',
    ];

    private function hasUserManagementPermission(User $authUser, string $action): bool
    {
        return $authUser->isSuperAdmin()
            || $authUser->hasPermission('admin', $action)
            || $authUser->hasPermission('hr', $action);
    }

    private function canManageRole(User $authUser, string $role): bool
    {
        if ($authUser->isSuperAdmin()) {
            return true;
        }

        // The EVP may delegate every role below the executive tier, but may
        // never create or modify another EVP or Super Admin account.
        if ($authUser->isExecutiveVP()) {
            return ! in_array($role, ['super_admin', 'executive_vice_president'], true);
        }

        // Operations Manager, Corporate Secretary, and any other role granted
        // dynamic HR/Admin CRUD permission remain staff administrators only.
        // A configurable permission must never become a path to grant finance,
        // procurement, managerial, or executive authority.
        return in_array($role, self::OPERATIONAL_STAFF_ROLES, true);
    }

    /**
     * Super Admin and Admin can list users.
     */
    public function viewAny(User $authUser): bool
    {
        return $authUser->hasPermission('admin', 'view');
    }

    /**
     * Super Admin and Admin can view any user profile.
     */
    public function view(User $authUser, User $targetUser): bool
    {
        return $authUser->hasPermission('admin', 'view');
    }

    /**
     * Only Super Admin and Admin can create new accounts.
     */
    public function create(User $authUser): bool
    {
        return $this->hasUserManagementPermission($authUser, 'create');
    }

    /**
     * Authorize the role selected while provisioning an account.
     */
    public function createWithRole(User $authUser, string $role): bool
    {
        return $this->create($authUser) && $this->canManageRole($authUser, $role);
    }

    /**
     * Admins can update any non-super_admin user.
     * Super Admin can update any user.
     */
    public function update(User $authUser, User $targetUser): bool
    {
        if (! $this->hasUserManagementPermission($authUser, 'edit')) {
            return false;
        }

        // Profile fields may be edited by the account owner, but role changes
        // are evaluated separately by assignRole().
        if ($authUser->is($targetUser)) {
            return true;
        }

        return $this->canManageRole($authUser, $targetUser->role);
    }

    /**
     * Prevent self-promotion and enforce both sides of a protected role change:
     * the actor must be allowed to manage the current account and to grant the
     * requested destination role.
     */
    public function assignRole(User $authUser, User $targetUser, string $role): bool
    {
        if ($role === $targetUser->role) {
            return $this->update($authUser, $targetUser);
        }

        if ($authUser->is($targetUser)) {
            return false;
        }

        return $this->update($authUser, $targetUser)
            && $this->canManageRole($authUser, $role);
    }

    /**
     * Only Super Admin can deactivate/activate accounts.
     * No one can touch the Super Admin account.
     */
    public function deactivate(User $authUser, User $targetUser): bool
    {
        if ($authUser->is($targetUser) || $targetUser->isSuperAdmin()) {
            return false;
        }

        return $this->hasUserManagementPermission($authUser, 'edit')
            && $this->canManageRole($authUser, $targetUser->role);
    }

    public function activate(User $authUser, User $targetUser): bool
    {
        if ($authUser->is($targetUser)) {
            return false;
        }

        return $this->hasUserManagementPermission($authUser, 'edit')
            && $this->canManageRole($authUser, $targetUser->role);
    }

    /**
     * Administrative password reset is never a self-service path. Protected
     * accounts follow the same hierarchy as role management.
     */
    public function resetPassword(User $authUser, User $targetUser): bool
    {
        if ($authUser->is($targetUser)) {
            return false;
        }

        return $this->hasUserManagementPermission($authUser, 'edit')
            && $this->canManageRole($authUser, $targetUser->role);
    }
}
