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
        Schema::table('passport_cases', function (Blueprint $table) {
            $table->string('destination_country')->nullable()->after('case_type');
            $table->string('visa_type')->nullable()->after('destination_country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('passport_cases', function (Blueprint $table) {
            $table->dropColumn(['destination_country', 'visa_type']);
        });
    }
};
