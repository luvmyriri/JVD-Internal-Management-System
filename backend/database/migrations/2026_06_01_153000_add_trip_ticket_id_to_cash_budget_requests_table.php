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
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->foreignId('trip_ticket_id')->nullable()->constrained('trip_tickets')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->dropForeign(['trip_ticket_id']);
            $table->dropColumn('trip_ticket_id');
        });
    }
};
