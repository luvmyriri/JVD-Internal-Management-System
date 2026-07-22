<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Strict single-bus/driver unique indexes dropped to support joiner/package partial seat bookings
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS trip_tickets_driver_date_active_unique');
            DB::statement('DROP INDEX IF EXISTS trip_tickets_bus_date_active_unique');
        }
    }
};
