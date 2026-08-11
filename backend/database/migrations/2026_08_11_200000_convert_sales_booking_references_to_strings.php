<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Sales references became human-readable in July 2026, but the original
     * PostgreSQL tables still constrained them to UUID values. Preserve all
     * existing UUID references as text and allow the new CHR/JNR/EDT codes.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (['charter_bookings', 'joiner_reservations', 'educational_tour_bookings'] as $table) {
            DB::statement(
                "ALTER TABLE {$table} ALTER COLUMN reference TYPE VARCHAR(255) USING reference::text"
            );
        }
    }

    /**
     * This conversion is intentionally irreversible: readable references are
     * not valid UUIDs, and coercing them on rollback would destroy identifiers.
     */
    public function down(): void
    {
        // Preserve reference data.
    }
};
