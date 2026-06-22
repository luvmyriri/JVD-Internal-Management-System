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
        Schema::table('payslips', function (Blueprint $table) {
            $table->decimal('commission_pay', 12, 2)->default(0.00)->after('allowances');
            $table->decimal('overtime_pay', 12, 2)->default(0.00)->after('commission_pay');
            $table->decimal('half_day_deductions', 12, 2)->default(0.00)->after('deductions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['commission_pay', 'overtime_pay', 'half_day_deductions']);
        });
    }
};
