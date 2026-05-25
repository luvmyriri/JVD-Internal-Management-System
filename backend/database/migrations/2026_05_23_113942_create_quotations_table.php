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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->date('quotation_date');
            $table->date('travel_date');
            $table->string('pick_up');
            $table->string('destination');
            $table->integer('no_of_days');
            $table->integer('no_of_units');
            $table->decimal('rates', 10, 2);
            $table->decimal('mark_up', 10, 2);
            
            // Expenses
            $table->decimal('diesel', 10, 2)->default(0);
            $table->decimal('toll_fee', 10, 2)->default(0);
            $table->decimal('meal_allowance', 10, 2)->default(0);
            $table->decimal('salary', 10, 2)->default(0);
            $table->decimal('sop', 10, 2)->default(0);
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('contingency_fund', 10, 2)->default(0);
            
            // Totals
            $table->decimal('total_expenses', 10, 2)->default(0);
            $table->decimal('net_income', 10, 2)->default(0);
            
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
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
        Schema::dropIfExists('quotations');
    }
};
