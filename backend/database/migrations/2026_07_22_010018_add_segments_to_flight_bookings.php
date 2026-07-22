<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->json('segments')->nullable()->after('return_at');
        });
    }

    public function down(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->dropColumn('segments');
        });
    }
};
