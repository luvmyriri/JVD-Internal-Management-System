<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Named abilities (verbs beyond the CRUD grid) granted to roles as data.
 * See User::hasAbility() for resolution and WorkflowService::canAct() for the
 * primary consumer (ability-based approver targeting).
 */
class RoleAbility extends Model
{
    protected $fillable = ['role', 'ability'];

    /**
     * Registry of known abilities: 'module.ability' => 'Human label'.
     * The admin UI lists these; checks validate against them. Extend here to add a verb.
     */
    public const ABILITIES = [
        'cash_budgets.approve_accounting' => 'Approve Cash Budget (Accounting)',
        'cash_budgets.approve_executive'  => 'Approve Cash Budget (Executive)',
        'cash_budgets.disburse'           => 'Disburse Cash Budget',
        'purchase_orders.verify'          => 'Verify Purchase Order',
        'purchase_orders.approve'         => 'Approve Purchase Order',
        'work_orders.approve'             => 'Approve Work Order',
        'invoices.finalize'               => 'Finalize Invoice',
        'documents.manage_hardcopy'       => 'Manage Hardcopy Documents',
    ];

    public static function registry(): array
    {
        return self::ABILITIES;
    }

    /**
     * All ability keys granted to a role (cached 5 min). Super admin has every ability.
     *
     * @return string[]
     */
    public static function getForRole(string $role): array
    {
        if ($role === 'super_admin') {
            return array_keys(self::ABILITIES);
        }

        return Cache::remember(
            "role_abilities:{$role}",
            300,
            fn () => self::where('role', $role)->pluck('ability')->all()
        );
    }

    public static function roleHasAbility(string $role, string $ability): bool
    {
        if ($role === 'super_admin') {
            return true;
        }

        return in_array($ability, self::getForRole($role), true);
    }

    public static function flushCache(string $role): void
    {
        Cache::forget("role_abilities:{$role}");
    }
}
