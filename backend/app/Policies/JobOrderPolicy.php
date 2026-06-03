<?php

namespace App\Policies;

use App\Models\JobOrder;
use App\Models\User;

class JobOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('procurement', 'view');
    }

    public function view(User $user, JobOrder $jo): bool
    {
        if ($user->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager')) {
            return true;
        }
        return $jo->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('procurement', 'create');
    }

    public function update(User $user, JobOrder $jo): bool
    {
        if ($user->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager')) {
            return true;
        }
        return $jo->created_by === $user->id && $jo->status === 'created';
    }
}
