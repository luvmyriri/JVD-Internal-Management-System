<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Modify work_orders table
        Schema::table('work_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('bus_id')->nullable()->change();
            $table->string('type')->default('maintenance')->after('wo_number');
            $table->foreignId('invoice_id')->nullable()->after('bus_id')->constrained('invoices')->nullOnDelete();
        });

        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() !== 'sqlite') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
                'pending_validation', 'pending_approval', 'verified', 'open', 'in_progress', 'completed', 'cancelled'
            ))");
        }

        // 2. Modify job_orders table
        Schema::table('job_orders', function (Blueprint $table) {
            $table->foreignId('driver_id')->nullable()->after('bus_id')->constrained('users')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->after('driver_id')->constrained('invoices')->nullOnDelete();
        });

        // 3. Modify trip_tickets table
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->foreignId('job_order_id')->nullable()->after('bus_id')->constrained('job_orders')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropForeign(['job_order_id']);
            $table->dropColumn('job_order_id');
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropForeign(['driver_id']);
            $table->dropForeign(['invoice_id']);
            $table->dropColumn(['driver_id', 'invoice_id']);
        });

        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() !== 'sqlite') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check");
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status IN (
                'pending_approval', 'verified', 'open', 'in_progress', 'completed', 'cancelled'
            ))");
        }

        Schema::table('work_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('bus_id')->nullable(false)->change();
            $table->dropColumn(['type']);
            $table->dropForeign(['invoice_id']);
            $table->dropColumn(['invoice_id']);
        });
    }

};
