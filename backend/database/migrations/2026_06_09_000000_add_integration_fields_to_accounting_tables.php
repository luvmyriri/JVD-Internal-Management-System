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
        Schema::table('commissions', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->constrained('users')->onDelete('set null');
        });

        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->foreignId('commission_id')->nullable()->constrained('commissions')->onDelete('set null');
            $table->foreignId('liquidation_id')->nullable()->constrained('liquidations')->onDelete('set null');
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->foreignId('liquidation_id')->nullable()->constrained('liquidations')->onDelete('set null');
            $table->foreignId('employee_id')->nullable()->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropForeign(['collections_employee_id_foreign']);
            $table->dropForeign(['collections_liquidation_id_foreign']);
            $table->dropColumn(['employee_id', 'liquidation_id']);
        });

        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->dropForeign(['cash_budget_requests_liquidation_id_foreign']);
            $table->dropForeign(['cash_budget_requests_commission_id_foreign']);
            $table->dropColumn(['liquidation_id', 'commission_id']);
        });

        Schema::table('commissions', function (Blueprint $table) {
            $table->dropForeign(['commissions_employee_id_foreign']);
            $table->dropColumn(['employee_id']);
        });
    }
};
