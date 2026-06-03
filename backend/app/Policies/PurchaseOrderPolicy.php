<?php

namespace App\Policies;

use App\Models\PurchaseOrder;
use App\Models\User;

class PurchaseOrderPolicy
{
    /**
     * Any authenticated user with the right role can see the PO list.
     * (Scoping by ownership is handled in the controller query.)
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('procurement', 'view') || $user->hasRole('accounting_executive');
    }

    /**
     * Admin/Accounting/SuperAdmin see any PO.
     * Agents can only view their own.
     */
    public function view(User $user, PurchaseOrder $po): bool
    {
        if ($user->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager', 'accounting_executive')) {
            return true;
        }
        return $po->created_by === $user->id;
    }

    /**
     * Agents, admins, and super admins can create PO drafts.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('procurement', 'create');
    }

    /**
     * Only the creator (while draft) or an admin can edit a PO.
     */
    public function update(User $user, PurchaseOrder $po): bool
    {
        if ($user->hasRole('super_admin', 'executive_vice_president', 'purchasing_manager')) {
            return true;
        }
        return $po->created_by === $user->id && $po->status === 'draft';
    }

    /**
     * Submitting a PO: must be the creator and the PO must be in draft.
     */
    public function submit(User $user, PurchaseOrder $po): bool
    {
        return $po->created_by === $user->id && $po->status === 'draft';
    }

    /**
     * Verifying a PO: Accounting and above only.
     */
    public function verify(User $user, PurchaseOrder $po): bool
    {
        return $user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive');
    }

    /**
     * Final approval: Super Admin only.
     */
    public function approve(User $user, PurchaseOrder $po): bool
    {
        return $user->hasRole('super_admin');
    }
}
