<?php

namespace Database\Seeders;

use App\Models\RoleAbility;
use Illuminate\Database\Seeder;

/**
 * Default named-ability grants (roadmap 2.3). Idempotent — safe to re-run.
 * Admins can edit these afterward via the role-abilities admin endpoints.
 */
class RoleAbilitySeeder extends Seeder
{
    public function run(): void
    {
        $grants = [
            'accounting_executive'     => ['cash_budgets.approve_accounting', 'invoices.finalize'],
            'executive_vice_president' => ['cash_budgets.approve_executive', 'purchase_orders.approve', 'work_orders.approve'],
            'purchasing_manager'       => ['purchase_orders.verify'],
            'corporate_secretary'      => ['cash_budgets.disburse'],
            'operations_manager'       => ['documents.manage_hardcopy'],
        ];

        foreach ($grants as $role => $abilities) {
            foreach ($abilities as $ability) {
                RoleAbility::firstOrCreate(['role' => $role, 'ability' => $ability]);
            }
            RoleAbility::flushCache($role);
        }
    }
}
