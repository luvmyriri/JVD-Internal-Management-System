<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Older synchronizers keyed tickets only by the replaceable bus-assignment
        // row. Keep the most operationally advanced ticket for each package/bus
        // position and detach superseded rows before enforcing the stable key.
        DB::table('trip_tickets')
            ->whereNotNull('educational_tour_package_id')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($ticket) => $ticket->educational_tour_package_id.':'.($ticket->assignment_index ?? 0))
            ->filter(fn ($tickets) => $tickets->count() > 1)
            ->each(function ($tickets) {
                $statusRank = [
                    'completed' => 4,
                    'approved' => 3,
                    'draft' => 2,
                    'cancelled' => 1,
                ];

                $keeper = $tickets
                    ->sortByDesc(fn ($ticket) => sprintf(
                        '%02d-%020d',
                        $statusRank[$ticket->status] ?? 0,
                        PHP_INT_MAX - (int) $ticket->id
                    ))
                    ->first();

                DB::table('trip_tickets')
                    ->whereIn('id', $tickets->pluck('id')->reject(fn ($id) => (int) $id === (int) $keeper->id))
                    ->update([
                        'educational_tour_package_id' => null,
                        'educational_tour_bus_assignment_id' => null,
                        'status' => 'cancelled',
                        'updated_at' => now(),
                    ]);
            });

        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->unique(
                ['educational_tour_package_id', 'assignment_index'],
                'trip_tickets_edu_package_assignment_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropUnique('trip_tickets_edu_package_assignment_unique');
        });
    }
};
