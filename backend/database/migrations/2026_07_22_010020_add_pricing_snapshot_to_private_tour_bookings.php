<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('private_tour_bookings', function (Blueprint $table) {
            $table->foreignId('originating_catalog_service_id')->nullable()->after('sales_order_item_id')->constrained('services')->nullOnDelete();
            $table->unsignedInteger('adult_count')->nullable()->after('passenger_count');
            $table->unsignedInteger('child_count')->nullable()->after('adult_count');
            $table->decimal('adult_rate', 15, 2)->nullable()->after('child_count');
            $table->decimal('child_rate', 15, 2)->nullable()->after('adult_rate');
            $table->json('traveler_types')->nullable()->after('child_rate');
        });
    }

    public function down(): void
    {
        Schema::table('private_tour_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('originating_catalog_service_id');
            $table->dropColumn(['adult_count', 'child_count', 'adult_rate', 'child_rate', 'traveler_types']);
        });
    }
};
