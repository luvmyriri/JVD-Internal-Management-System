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
        DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
        DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'pending_accounting'::character varying, 'pending_super_admin'::character varying, 'approved'::character varying, 'disbursed'::character varying, 'liquidated'::character varying]::text[]))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
        DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'pending_accounting'::character varying, 'approved'::character varying, 'disbursed'::character varying, 'liquidated'::character varying]::text[]))");
    }
};
