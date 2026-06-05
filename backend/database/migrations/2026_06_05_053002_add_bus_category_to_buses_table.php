<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add bus_category column to buses table.
     */
    public function up(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->enum('bus_category', ['LUXURY', 'VIP', 'ECONOMY'])->default('ECONOMY')->after('model');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropColumn('bus_category');
        });
    }
};
