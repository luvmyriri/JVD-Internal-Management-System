<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to add optimized indexes.
     */
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->index('company_name');
            $table->index('contact_person');
            $table->index('email');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('first_name');
            $table->index('last_name');
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropIndex(['company_name']);
            $table->dropIndex(['contact_person']);
            $table->dropIndex(['email']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['first_name']);
            $table->dropIndex(['last_name']);
            $table->dropIndex(['role']);
        });
    }
};
