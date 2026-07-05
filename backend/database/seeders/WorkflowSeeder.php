<?php

namespace Database\Seeders;

use App\Models\WorkflowDefinition;
use Illuminate\Database\Seeder;

class WorkflowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $def = WorkflowDefinition::firstOrCreate([
            'module' => 'cash_budgets'
        ], [
            'name' => 'Cash Budget Request',
            'active' => true,
        ]);

        $def->steps()->delete();

        // Step 1: Accounting Approval
        $def->steps()->create([
            'order' => 1,
            'name' => 'Accounting Approval',
            'approver_type' => 'role',
            'approver_value' => 'accounting_executive',
            'condition_json' => null,
        ]);

        // Step 2: Super Admin / EVP Approval
        $def->steps()->create([
            'order' => 2,
            'name' => 'Super Admin Approval',
            'approver_type' => 'role',
            'approver_value' => 'executive_vice_president', // Will allow super admin implicitly
            'condition_json' => null,
        ]);

        // Step 3: Disbursement (Super Admin or EVP)
        $def->steps()->create([
            'order' => 3,
            'name' => 'Disbursement',
            'approver_type' => 'role',
            'approver_value' => 'super_admin', // Handled specially in logic, but usually we just do role
            'condition_json' => null,
        ]);
    }
}
