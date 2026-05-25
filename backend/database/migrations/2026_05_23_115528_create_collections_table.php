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
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->date('date');
            
            // Travel Arrangement
            $table->date('travel_date');
            $table->string('pick_up')->nullable();
            $table->string('drop_off')->nullable();
            $table->decimal('rate', 10, 2)->default(0);
            
            $table->foreignId('customer_id')->nullable()->constrained('customers');
            $table->enum('status', ['open', 'completed'])->default('open');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
