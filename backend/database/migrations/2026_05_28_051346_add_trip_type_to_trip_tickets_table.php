<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a trip_type column to trip_tickets to categorize each trip
     * as either 'domestic' (default) or 'international'.
     */
    public function up(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->enum('trip_type', ['domestic', 'international'])
                  ->default('domestic')
                  ->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropColumn('trip_type');
        });
    }
};
