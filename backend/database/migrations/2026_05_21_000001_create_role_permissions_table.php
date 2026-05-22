<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role', 50)->index();           // e.g. admin, agent, driver
            $table->string('module', 50)->index();          // e.g. procurement, fleet, travel
            $table->boolean('can_view')->default(false);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->timestamps();

            $table->unique(['role', 'module']); // One permission row per role + module
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
