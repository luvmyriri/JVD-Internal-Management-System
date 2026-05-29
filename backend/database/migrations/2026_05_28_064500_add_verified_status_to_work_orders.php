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
        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete()->after('approved_at');
            $table->timestamp('verified_at')->nullable()->after('verified_by');
            
            $table->index('verified_by');
        });

        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
            DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
                'pending_approval', 'verified', 'open', 'in_progress', 'completed', 'cancelled'
            ))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['verified_by']);
            $table->dropColumn(['verified_by', 'verified_at']);
        });

        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
            DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
                'pending_approval', 'open', 'in_progress', 'completed', 'cancelled'
            ))");
        }
    }
};
