<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Business Rule: Auto-generated Work Orders must be APPROVED by the
     * designated employee before any maintenance work proceeds.
     * (Boss mandate: "auto generated work orders should be approved by the
     *  designated employee before proceeding.")
     *
     * Adds approval tracking fields and extends the status column to
     * include 'pending_approval' and 'cancelled' using PostgreSQL-compatible
     * ALTER TYPE syntax.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            // Who approved this WO (required for auto-generated PMS WOs)
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('created_by');
            // When it was approved
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            // Approval/rejection notes
            $table->text('approval_notes')->nullable()->after('approved_at');

            $table->index('approved_by');
        });

        // PostgreSQL: add new enum values to the existing type
        // The status column was defined inline (not as a named type), so we
        // alter the column using a string type with a CHECK constraint workaround.
        DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
        DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
            'pending_approval', 'open', 'in_progress', 'completed', 'cancelled'
        ))");
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropIndex(['approved_by']);
            $table->dropColumn(['approved_by', 'approved_at', 'approval_notes']);
        });

        DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
        DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
            'open', 'in_progress', 'completed'
        ))");
    }
};
