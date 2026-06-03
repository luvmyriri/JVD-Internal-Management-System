<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->decimal('actual_diesel', 10, 2)->nullable();
            $table->decimal('actual_meal_allowance', 10, 2)->nullable();
            $table->decimal('actual_sop', 10, 2)->nullable();
            $table->decimal('actual_autosweep', 10, 2)->nullable();
            $table->decimal('actual_easytrip', 10, 2)->nullable();
            $table->decimal('actual_coach_captain_salary', 10, 2)->nullable();
            $table->decimal('actual_spare_driver_salary', 10, 2)->nullable();
            
            $table->decimal('liquidated_amount', 10, 2)->nullable();
        });

        // Update the status enum check constraint to include 'liquidated'
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
            DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'pending_accounting'::character varying, 'approved'::character varying, 'disbursed'::character varying, 'liquidated'::character varying]::text[]))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->dropColumn([
                'actual_diesel',
                'actual_meal_allowance',
                'actual_sop',
                'actual_autosweep',
                'actual_easytrip',
                'actual_coach_captain_salary',
                'actual_spare_driver_salary',
                'liquidated_amount'
            ]);
        });

        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE cash_budget_requests DROP CONSTRAINT IF EXISTS cash_budget_requests_status_check");
            DB::statement("ALTER TABLE cash_budget_requests ADD CONSTRAINT cash_budget_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::character varying, 'pending_accounting'::character varying, 'approved'::character varying, 'disbursed'::character varying]::text[]))");
        }
    }
};
