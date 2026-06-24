<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->foreignId('super_admin_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('cash_budget_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('super_admin_approved_by');
        });
    }
};
