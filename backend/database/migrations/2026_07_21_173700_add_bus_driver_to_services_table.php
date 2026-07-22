<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->foreignId('bus_id')->nullable()->after('fixed_arrival_datetime')->constrained('buses')->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->after('bus_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['bus_id']);
            $table->dropForeign(['driver_id']);
            $table->dropColumn(['bus_id', 'driver_id']);
        });
    }
};
