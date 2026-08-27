<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_tour_packages', function (Blueprint $table) {
            $table->decimal('adult_rate_per_head', 15, 2)->nullable()->after('rate_per_head');
        });

        Schema::table('educational_tour_participant_bookings', function (Blueprint $table) {
            $table->string('participant_type', 30)->default('student')->after('participant_last_name');
            $table->index(['package_id', 'participant_type']);
        });
    }

    public function down(): void
    {
        Schema::table('educational_tour_participant_bookings', function (Blueprint $table) {
            $table->dropIndex(['package_id', 'participant_type']);
            $table->dropColumn('participant_type');
        });

        Schema::table('educational_tour_packages', function (Blueprint $table) {
            $table->dropColumn('adult_rate_per_head');
        });
    }
};
