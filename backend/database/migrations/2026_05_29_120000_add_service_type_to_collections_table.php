<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            // Preset service types plus a free-text 'other_service_type' for custom entries
            $table->string('service_type')->nullable()->after('client_name');
            $table->string('other_service_type')->nullable()->after('service_type');
        });
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropColumn(['service_type', 'other_service_type']);
        });
    }
};
