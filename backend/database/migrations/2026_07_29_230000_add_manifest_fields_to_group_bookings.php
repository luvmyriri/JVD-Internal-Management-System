<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_tour_programs', function (Blueprint $table) {
            $table->json('images')->nullable()->after('learning_objectives');
        });

        Schema::table('charter_bookings', function (Blueprint $table) {
            $table->string('booking_mode')->default('entire_vehicle')->after('passenger_count');
            $table->json('selected_seats')->nullable()->after('booking_mode');
            $table->json('passengers')->nullable()->after('selected_seats');
            $table->json('fleet_assignments')->nullable()->after('passengers');
        });

        Schema::table('educational_tour_bookings', function (Blueprint $table) {
            $table->string('booking_mode')->default('entire_vehicle')->after('chaperone_count');
            $table->json('selected_seats')->nullable()->after('booking_mode');
            $table->json('passengers')->nullable()->after('selected_seats');
        });
    }

    public function down(): void
    {
        Schema::table('educational_tour_bookings', function (Blueprint $table) {
            $table->dropColumn(['booking_mode', 'selected_seats', 'passengers']);
        });

        Schema::table('charter_bookings', function (Blueprint $table) {
            $table->dropColumn(['booking_mode', 'selected_seats', 'passengers', 'fleet_assignments']);
        });

        Schema::table('educational_tour_programs', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }
};
