<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add seat_map JSON and bus_id FK to invoices for POS seat selector.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('bus_id')->nullable()->after('id');
            $table->json('seat_map')->nullable()->after('bus_id');

            $table->foreign('bus_id')->references('id')->on('buses')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['bus_id']);
            $table->dropColumn(['bus_id', 'seat_map']);
        });
    }
};
