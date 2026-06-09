<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->date('travel_date')->nullable()->after('due_date');
            $table->string('pickup_location')->nullable()->after('travel_date');
            $table->string('tour_code')->nullable()->after('pickup_location');
            $table->integer('pax_count')->nullable()->after('tour_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['travel_date', 'pickup_location', 'tour_code', 'pax_count']);
        });
    }
};
