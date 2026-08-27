<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->foreignId('educational_tour_package_id')
                ->nullable()
                ->after('assignment_index')
                ->constrained('educational_tour_packages')
                ->nullOnDelete();
            $table->foreignId('educational_tour_bus_assignment_id')
                ->nullable()
                ->unique()
                ->after('educational_tour_package_id')
                ->constrained('educational_tour_bus_assignments')
                ->nullOnDelete();
            $table->string('tour_name', 180)->nullable()->after('educational_tour_bus_assignment_id');
            $table->string('tour_code', 40)->nullable()->after('tour_name');
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropUnique('trip_tickets_educational_tour_bus_assignment_id_unique');
            $table->dropConstrainedForeignId('educational_tour_bus_assignment_id');
            $table->dropConstrainedForeignId('educational_tour_package_id');
            $table->dropColumn(['tour_name', 'tour_code']);
        });
    }
};
