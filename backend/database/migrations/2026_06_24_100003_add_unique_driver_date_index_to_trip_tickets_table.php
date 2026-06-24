<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("CREATE UNIQUE INDEX trip_tickets_driver_date_active_unique ON trip_tickets (driver_id, date_of_travel) WHERE status != 'cancelled'");
            DB::statement("CREATE UNIQUE INDEX trip_tickets_bus_date_active_unique ON trip_tickets (bus_id, date_of_travel) WHERE status != 'cancelled'");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS trip_tickets_driver_date_active_unique');
            DB::statement('DROP INDEX IF EXISTS trip_tickets_bus_date_active_unique');
        }
    }
};
