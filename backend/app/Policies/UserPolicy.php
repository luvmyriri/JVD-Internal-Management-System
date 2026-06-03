<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
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
        return $authUser->hasPermission('admin', 'create');
    }

    /**
     * Admins can update any non-super_admin user.
     * Super Admin can update any user.
     */
    public function update(User $authUser, User $targetUser): bool
    {
        if ($authUser->isSuperAdmin()) {
            return true;
        }
        return $authUser->hasPermission('admin', 'edit') && !$targetUser->isSuperAdmin();
    }

    /**
     * Only Super Admin can deactivate/activate accounts.
     * No one can touch the Super Admin account.
     */
    public function deactivate(User $authUser, User $targetUser): bool
    {
        return $authUser->isSuperAdmin() && !$targetUser->isSuperAdmin();
    }
}
