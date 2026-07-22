<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->foreignId('passport_case_id')
                ->nullable()
                ->after('service_id')
                ->constrained('passport_cases')
                ->nullOnDelete();
            $table->unique('passport_case_id', 'invoice_items_passport_case_unique');
        });

        Schema::table('custom_transaction_details', function (Blueprint $table) {
            $table->unique('passport_case_id', 'custom_tx_details_passport_case_unique');
        });
    }

    public function down(): void
    {
        Schema::table('custom_transaction_details', function (Blueprint $table) {
            $table->dropUnique('custom_tx_details_passport_case_unique');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropUnique('invoice_items_passport_case_unique');
            $table->dropConstrainedForeignId('passport_case_id');
        });
    }
};
