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
        Schema::create('liquidation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('liquidation_id')->constrained('liquidations')->onDelete('cascade');
            $table->string('expense_category'); // Fuel, Toll, Meals, Parts, Other
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('receipt_number')->nullable();
            $table->string('status')->default('pending'); // pending, approved, rejected, disputed
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liquidation_items');
    }
};
