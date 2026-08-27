<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement("
                CREATE UNIQUE INDEX IF NOT EXISTS edt_active_seat_unique 
                ON educational_tour_participant_bookings (bus_assignment_id, seat_number) 
                WHERE bus_assignment_id IS NOT NULL 
                  AND seat_number IS NOT NULL 
                  AND status NOT IN ('cancelled', 'expired')
            ");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('DROP INDEX IF EXISTS edt_active_seat_unique');
        }
    }
};
