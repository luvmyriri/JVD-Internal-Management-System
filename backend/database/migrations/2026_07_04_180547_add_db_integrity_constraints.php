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
        // 1. Soft Deletes
        Schema::table('invoices', function (Blueprint $table) {
            $table->softDeletes();
        });
        Schema::table('collections', function (Blueprint $table) {
            $table->softDeletes();
        });
        Schema::table('liquidations', function (Blueprint $table) {
            $table->softDeletes();
        });
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->softDeletes();
        });

        // 2. Foreign Keys (Cascade/Null -> Restrict)
        Schema::table('collections', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->foreign('invoice_id')
                  ->references('id')
                  ->on('invoices')
                  ->restrictOnDelete();
        });

        Schema::table('collection_payments', function (Blueprint $table) {
            $table->dropForeign(['collection_id']);
            $table->foreign('collection_id')
                  ->references('id')
                  ->on('collections')
                  ->restrictOnDelete();
        });

        // 3. Check Constraints
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE collection_payments ADD CONSTRAINT check_amount_positive CHECK (amount >= 0)');
            DB::statement('ALTER TABLE invoices ADD CONSTRAINT check_total_amount_positive CHECK (total_amount >= 0)');
            DB::statement('ALTER TABLE collections ADD CONSTRAINT check_billing_amount_positive CHECK (billing_amount >= 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE collection_payments DROP CONSTRAINT check_amount_positive');
            DB::statement('ALTER TABLE invoices DROP CONSTRAINT check_total_amount_positive');
            DB::statement('ALTER TABLE collections DROP CONSTRAINT check_billing_amount_positive');
        }

        Schema::table('collection_payments', function (Blueprint $table) {
            $table->dropForeign(['collection_id']);
            $table->foreign('collection_id')
                  ->references('id')
                  ->on('collections')
                  ->cascadeOnDelete();
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->foreign('invoice_id')
                  ->references('id')
                  ->on('invoices')
                  ->nullOnDelete();
        });

        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('liquidations', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('collections', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
