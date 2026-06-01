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
            // 1. Accreditations entity_type check constraint
            DB::statement("ALTER TABLE accreditations DROP CONSTRAINT IF EXISTS accreditations_entity_type_check");
            DB::statement("ALTER TABLE accreditations ADD CONSTRAINT accreditations_entity_type_check
                CHECK (entity_type IN ('supplier', 'partner', 'client', 'driver', 'bus'))");

            // 2. Procurement Documents transaction_type check constraint
            DB::statement("ALTER TABLE procurement_documents DROP CONSTRAINT IF EXISTS procurement_docs_transaction_type_check");
            DB::statement("ALTER TABLE procurement_documents ADD CONSTRAINT procurement_docs_transaction_type_check
                CHECK (transaction_type IN ('purchase_order', 'job_order', 'work_order', 'general') OR transaction_type IS NULL)");

            // 3. PostgreSQL trigger function to clean up accreditations when a bus is deleted
            DB::statement("DROP TRIGGER IF EXISTS bus_delete_accreditations ON buses");
            DB::statement("DROP FUNCTION IF EXISTS cleanup_bus_accreditations");

            DB::statement("
                CREATE OR REPLACE FUNCTION cleanup_bus_accreditations()
                RETURNS TRIGGER AS $$
                BEGIN
                    DELETE FROM accreditations 
                    WHERE entity_type = 'bus' AND entity_id = OLD.id;
                    RETURN OLD;
                END;
                $$ LANGUAGE plpgsql;
            ");

            DB::statement("
                CREATE TRIGGER bus_delete_accreditations
                BEFORE DELETE ON buses
                FOR EACH ROW EXECUTE FUNCTION cleanup_bus_accreditations();
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement("DROP TRIGGER IF EXISTS bus_delete_accreditations ON buses");
            DB::statement("DROP FUNCTION IF EXISTS cleanup_bus_accreditations");
            DB::statement("ALTER TABLE accreditations DROP CONSTRAINT IF EXISTS accreditations_entity_type_check");
            DB::statement("ALTER TABLE procurement_documents DROP CONSTRAINT IF EXISTS procurement_docs_transaction_type_check");
        }
    }
};
