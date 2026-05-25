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
        Schema::create('cash_budget_requests', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            
            // Description section
            $table->date('travel_date');
            $table->string('plate_number')->nullable();
            $table->string('destination');
            
            // Amount section
            $table->decimal('diesel', 10, 2)->default(0);
            $table->decimal('meal_allowance', 10, 2)->default(0);
            $table->decimal('sop', 10, 2)->default(0);
            $table->decimal('autosweep', 10, 2)->default(0);
            $table->decimal('easytrip', 10, 2)->default(0);
            $table->decimal('coach_captain_salary', 10, 2)->default(0);
            $table->decimal('spare_driver_salary', 10, 2)->default(0);
            
            $table->decimal('total_amount', 10, 2)->default(0);
            
            $table->enum('status', ['draft', 'approved', 'disbursed'])->default('draft');
            $table->foreignId('prepared_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_budget_requests');
    }
};
