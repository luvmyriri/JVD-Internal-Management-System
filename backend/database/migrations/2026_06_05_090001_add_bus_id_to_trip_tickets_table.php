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
            $foreignKeys = Schema::getForeignKeys('trip_tickets');
            $hasBusIdFk = false;
            foreach ($foreignKeys as $fk) {
                if (in_array('bus_id', $fk['columns'])) {
                    $hasBusIdFk = true;
                    break;
                }
            }

            if (!$hasBusIdFk) {
                $table->foreign('bus_id')->references('id')->on('buses')->nullOnDelete();
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
