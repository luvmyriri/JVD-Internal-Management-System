<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itineraries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->unsignedSmallInteger('day_number');
            $table->date('date')->nullable(); // itinerary can be built before exact dates are locked
            $table->string('location')->nullable();
            $table->text('activity_description')->nullable();
            $table->string('meal_plan')->nullable();
            $table->string('accommodation_name')->nullable();
            $table->time('check_in_time')->nullable();
            $table->time('check_out_time')->nullable();
            $table->timestamps();

            $table->unique(['invoice_id', 'day_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itineraries');
    }
};
