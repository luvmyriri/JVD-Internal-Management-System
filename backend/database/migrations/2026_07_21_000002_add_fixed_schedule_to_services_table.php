<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Pre-set departure time and arrival datetime for fixed packages
            $table->string('fixed_departure_time')->nullable()->after('fixed_date');
            $table->string('fixed_arrival_datetime')->nullable()->after('fixed_departure_time');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['fixed_departure_time', 'fixed_arrival_datetime']);
        });
    }
};
