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
        Schema::create('employee_salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->decimal('base_salary', 12, 2)->default(0.00);
            $table->decimal('allowances', 12, 2)->default(0.00);
            $table->decimal('deductions', 12, 2)->default(0.00);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('payroll_cycles', function (Blueprint $table) {
            $table->id();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('gross_amount', 15, 2)->default(0.00);
            $table->decimal('tax_amount', 15, 2)->default(0.00);
            $table->decimal('net_amount', 15, 2)->default(0.00);
            $table->string('status')->default('draft'); // 'draft', 'released'
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_cycle_id')->constrained('payroll_cycles')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('base_salary', 12, 2)->default(0.00);
            $table->decimal('allowances', 12, 2)->default(0.00);
            $table->decimal('deductions', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('net_salary', 12, 2)->default(0.00);
            $table->string('status')->default('draft'); // 'draft', 'released'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_cycles');
        Schema::dropIfExists('employee_salaries');
    }
};
