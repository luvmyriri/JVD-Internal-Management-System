<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Business Rule: A Job Order can be linked to a Work Order.
     * - Ma'am Minda issues the JO
     * - If no PO is needed, the JO proceeds immediately (linked WO)
     * - If parts are needed externally, a PO is generated first
     *
     * Also separates JO types:
     *  'maintenance' = PMS-driven (mechanics, vehicle maintenance)
     *  'travel'      = Customer travel services (existing)
     *
     * And adds: requested_by (mechanics can request JOs for vehicle maintenance)
     */
    public function up(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            // Link JO back to the WO that spawned it (nullable — not all JOs are from a WO)
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete()->after('bus_id');

            // Link JO to a PO when parts must be sourced externally (nullable)
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete()->after('work_order_id');

            // Who requested this JO (mechanics can request)
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete()->after('created_by');

            // Whether PO is required for this JO to proceed
            $table->boolean('requires_po')->default(false)->after('requested_by');

            $table->index('work_order_id');
            $table->index('purchase_order_id');
        });

        // PostgreSQL: extend service_type enum using CHECK constraint
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS job_orders_service_type_check");
            DB::statement("ALTER TABLE job_orders ADD CONSTRAINT job_orders_service_type_check CHECK (service_type IN (
                'bus_rental', 'field_trip', 'corporate_transport', 'travel_package', 'event', 'maintenance'
            ))");
        }
    }

    public function down(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropForeign(['work_order_id']);
            $table->dropForeign(['purchase_order_id']);
            $table->dropForeign(['requested_by']);
            $table->dropIndex(['work_order_id', 'purchase_order_id']);
            $table->dropColumn(['work_order_id', 'purchase_order_id', 'requested_by', 'requires_po']);
        });

        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS job_orders_service_type_check");
            DB::statement("ALTER TABLE job_orders ADD CONSTRAINT job_orders_service_type_check CHECK (service_type IN (
                'bus_rental', 'field_trip', 'corporate_transport', 'travel_package', 'event'
            ))");
        }
    }
};
