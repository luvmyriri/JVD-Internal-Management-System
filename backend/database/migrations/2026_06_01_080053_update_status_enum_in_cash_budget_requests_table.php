<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            // Drop the existing check constraint created by the enum
            DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
            
            // Add the new check constraint with 'pending_accounting' included
            DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'pending_accounting'::character varying, 'approved'::character varying, 'disbursed'::character varying]::text[]))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
            DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'approved'::character varying, 'disbursed'::character varying]::text[]))");
        }
    }
};
