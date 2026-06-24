<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('liquidations', function (Blueprint $table) {
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete()->after('trip_ticket_id');
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete()->after('work_order_id');
            $table->foreignId('payroll_cycle_id')->nullable()->constrained('payroll_cycles')->nullOnDelete()->after('purchase_order_id');
            $table->string('source_type')->default('general')->after('employee_id');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE liquidations ADD CONSTRAINT liquidations_source_type_check CHECK (source_type IN ('general', 'dtt', 'maintenance', 'payroll', 'commission'))");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE liquidations DROP CONSTRAINT IF EXISTS liquidations_source_type_check');
        }

        Schema::table('liquidations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('work_order_id');
            $table->dropConstrainedForeignId('purchase_order_id');
            $table->dropConstrainedForeignId('payroll_cycle_id');
            $table->dropColumn('source_type');
        });
    }
};
