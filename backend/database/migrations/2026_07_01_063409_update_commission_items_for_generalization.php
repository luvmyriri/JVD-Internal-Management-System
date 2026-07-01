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
        Schema::table('commission_items', function (Blueprint $table) {
            $table->string('source_type')->nullable()->after('commission_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->string('description')->nullable()->after('source_id');
            
            // Make existing fields nullable for backward compatibility
            $table->date('travel_date')->nullable()->change();
            $table->string('destination')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commission_items', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'source_id', 'description']);
            // Cannot easily revert nullable change in SQLite, but standard Doctrine allows it.
            // Leaving as nullable on rollback is usually fine, or explicitly drop it if required.
        });
    }
};
