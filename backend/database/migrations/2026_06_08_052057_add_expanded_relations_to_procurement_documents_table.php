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
        Schema::table('procurement_documents', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('job_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('work_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('trip_ticket_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_documents', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['job_order_id']);
            $table->dropForeign(['work_order_id']);
            $table->dropForeign(['trip_ticket_id']);
            $table->dropColumn(['customer_id', 'job_order_id', 'work_order_id', 'trip_ticket_id']);
        });
    }
};
