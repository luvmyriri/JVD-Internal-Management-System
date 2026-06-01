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
            // Drop the existing check constraint for invoices.status
            DB::statement("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check");
        }
        
        // Let's just drop the constraint completely to allow any status for now, since we have things like 'pending_payment', 'disbursed_budget', 'paid', 'cancelled', 'partial', etc.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // If we down, we can attempt to put the original one back if it strictly had pending, paid, cancelled. 
        // But doing so might crash if there is existing data. We will leave it empty.
    }
};
