<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->string('vehicle_type')->default('bus')->after('model');
            $table->index(['vehicle_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropIndex(['vehicle_type', 'status']);
            $table->dropColumn('vehicle_type');
        });
    }
};

