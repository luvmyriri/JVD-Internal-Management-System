<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Fixed date for Joiner packages — when set, the travel date is pre-determined
            // and cannot be changed by the customer at POS checkout.
            $table->date('fixed_date')->nullable()->after('max_pax');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('fixed_date');
        });
    }
};
