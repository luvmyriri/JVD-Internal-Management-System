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
        Schema::table('services', function (Blueprint $table) {
            $table->boolean('is_tour')->default(false);
            $table->decimal('bus_price', 15, 2)->nullable();
            $table->decimal('coaster_price', 15, 2)->nullable();
            $table->integer('tour_kms')->nullable();
            $table->integer('tour_hours')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'is_tour',
                'bus_price',
                'coaster_price',
                'tour_kms',
                'tour_hours'
            ]);
        });
    }
};

