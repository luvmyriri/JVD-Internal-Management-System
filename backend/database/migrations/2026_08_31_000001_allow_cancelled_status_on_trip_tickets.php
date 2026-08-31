<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE trip_tickets DROP CONSTRAINT IF EXISTS trip_tickets_status_check');
            DB::statement('ALTER TABLE trip_tickets ALTER COLUMN status TYPE VARCHAR(255)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE trip_tickets ADD CONSTRAINT trip_tickets_status_check CHECK (status IN ('draft', 'approved', 'completed', 'cancelled'))");
        }
    }
};
