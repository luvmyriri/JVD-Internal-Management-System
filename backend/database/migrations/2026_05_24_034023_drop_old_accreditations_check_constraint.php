<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE accreditations DROP CONSTRAINT IF EXISTS accreditations_entity_type_check");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-adding is not strictly required since it was intentionally changed to string
    }
};
