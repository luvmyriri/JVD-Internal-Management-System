<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ensure bus_id FK exists on trip_tickets (column may already exist).
     */
    public function up(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            // Add bus_id FK if not already present
            if (!Schema::hasColumn('trip_tickets', 'bus_id')) {
                $table->unsignedBigInteger('bus_id')->nullable()->after('id');
            }

            // Add FK constraint if not already present
            if (DB::getDriverName() === 'sqlite') {
                $fks = DB::select("PRAGMA foreign_key_list('trip_tickets')");
                $hasFk = false;
                foreach ($fks as $fk) {
                    $tbl = is_object($fk) ? ($fk->table ?? '') : ($fk['table'] ?? '');
                    if ($tbl === 'buses') {
                        $hasFk = true;
                        break;
                    }
                }
                if (!$hasFk) {
                    $table->foreign('bus_id')->references('id')->on('buses')->nullOnDelete();
                }
            } else {
                $fks = DB::select("
                    SELECT constraint_name
                    FROM information_schema.table_constraints
                    WHERE table_name = 'trip_tickets'
                      AND constraint_type = 'FOREIGN KEY'
                      AND constraint_name = 'trip_tickets_bus_id_foreign'
                ");
                if (empty($fks)) {
                    $table->foreign('bus_id')->references('id')->on('buses')->nullOnDelete();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropForeignIfExists(['bus_id']);
        });
    }
};
