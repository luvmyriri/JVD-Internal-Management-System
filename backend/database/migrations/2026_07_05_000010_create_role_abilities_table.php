<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Roadmap 2.3 — Abilities & roles-as-data.
 *
 * `role_abilities` grants named abilities (verbs beyond the CRUD grid, e.g.
 * cash_budgets.approve_accounting) to roles as editable data. `users.custom_abilities`
 * holds per-user grant/revoke overrides so one person can be given (or denied) a single
 * ability without inventing a new role.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_abilities', function (Blueprint $table) {
            $table->id();
            $table->string('role')->index();
            $table->string('ability');
            $table->timestamps();
            $table->unique(['role', 'ability']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->json('custom_abilities')->nullable()->after('custom_permissions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('custom_abilities');
        });
        Schema::dropIfExists('role_abilities');
    }
};
