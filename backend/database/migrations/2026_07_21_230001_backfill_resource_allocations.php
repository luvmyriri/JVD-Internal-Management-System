<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $insert = function (string $sourceType, int $sourceId, ?int $busId, ?int $driverId, $startsAt, $endsAt, ?string $reference, string $status): void {
            if (!$busId && !$driverId) return;
            DB::table('resource_allocations')->updateOrInsert(
                ['source_type' => $sourceType, 'source_id' => $sourceId, 'bus_id' => $busId],
                ['driver_id' => $driverId, 'starts_at' => $startsAt, 'ends_at' => $endsAt, 'status' => $status, 'reference' => $reference, 'updated_at' => now(), 'created_at' => now()]
            );
        };

        foreach (DB::table('charter_bookings')->whereNotIn('status', ['cancelled', 'completed'])->get() as $booking) {
            $insert(\App\Models\CharterBooking::class, $booking->id, $booking->bus_id, $booking->driver_id, $booking->starts_at, $booking->ends_at, $booking->reference, $booking->status);
        }
        foreach (DB::table('educational_tour_vehicles as vehicle')->join('educational_tour_bookings as booking', 'booking.id', '=', 'vehicle.booking_id')->whereNotIn('booking.status', ['cancelled', 'completed'])->select('booking.*', 'vehicle.bus_id', 'vehicle.driver_id')->get() as $booking) {
            $insert(\App\Models\EducationalTourBooking::class, $booking->id, $booking->bus_id, $booking->driver_id, $booking->starts_at, $booking->ends_at, $booking->reference, $booking->status);
        }
        foreach (DB::table('joiner_departures')->whereNotIn('status', ['cancelled', 'completed'])->get() as $departure) {
            $insert(\App\Models\JoinerDeparture::class, $departure->id, $departure->bus_id, $departure->driver_id, $departure->starts_at, $departure->ends_at, $departure->code, $departure->status);
        }
        foreach (DB::table('trip_tickets')->whereNotIn('status', ['cancelled', 'completed'])->get() as $ticket) {
            $start = Carbon::parse($ticket->date_of_travel);
            $insert(\App\Models\TripTicket::class, $ticket->id, $ticket->bus_id, $ticket->driver_id, $start, $start->copy()->addDay(), $ticket->control_no, $ticket->status);
        }
    }

    public function down(): void
    {
        DB::table('resource_allocations')->whereIn('source_type', [
            \App\Models\CharterBooking::class,
            \App\Models\EducationalTourBooking::class,
            \App\Models\JoinerDeparture::class,
            \App\Models\TripTicket::class,
        ])->delete();
    }
};
