<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Stores per-user dashboard override. When set, this overrides the
            // default role→dashboard mapping in Dashboard.tsx.
            // Allowed values mirror the dashboard keys: admin, accounting,
            // operations, logistics, procurement, maintenance, hr, agent, driver
            $table->string('dashboard_preference')->nullable()->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('dashboard_preference');
        });
    }
};
