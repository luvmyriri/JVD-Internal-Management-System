<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
            $table->foreignId('bus_id')->nullable()->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->json('seat_map')->nullable();
            $table->date('travel_date')->nullable();
            $table->string('pickup_location')->nullable();
            $table->string('tour_code')->nullable();
            $table->integer('pax_count')->nullable();
            $table->timestamp('arrival_datetime')->nullable();
            $table->timestamp('departure_datetime')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();
            $table->softDeletes();
        });

        // Migrate existing operational data
        $invoices = DB::table('invoices')->get();
        foreach ($invoices as $inv) {
            // Only create booking if it has travel details
            if ($inv->bus_id || $inv->travel_date || $inv->pickup_location || $inv->tour_code || $inv->pax_count || $inv->arrival_datetime || $inv->departure_datetime) {
                DB::table('bookings')->insert([
                    'invoice_id' => $inv->id,
                    'bus_id' => $inv->bus_id,
                    'driver_id' => $inv->driver_id,
                    'seat_map' => $inv->seat_map,
                    'travel_date' => $inv->travel_date,
                    'pickup_location' => $inv->pickup_location,
                    'tour_code' => $inv->tour_code,
                    'pax_count' => $inv->pax_count,
                    'arrival_datetime' => $inv->arrival_datetime,
                    'departure_datetime' => $inv->departure_datetime,
                    'status' => 'confirmed', // Old invoices are likely confirmed
                    'created_at' => $inv->created_at,
                    'updated_at' => $inv->updated_at,
                ]);

                $bookingId = DB::getPdo()->lastInsertId();

                // Update travels table to point to booking instead of invoice
                DB::table('travels')
                    ->where('reference_type', 'invoice')
                    ->where('reference_id', $inv->id)
                    ->update([
                        'reference_type' => 'booking',
                        'reference_id' => $bookingId,
                    ]);
            }
        }

        // Drop the columns from invoices if we are not in SQLite
        // Laravel 11 handles sqlite drop column using ALTER TABLE DROP COLUMN directly
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['bus_id']);
            $table->dropForeign(['driver_id']);
            $table->dropColumn([
                'bus_id',
                'driver_id',
                'seat_map',
                'travel_date',
                'pickup_location',
                'tour_code',
                'pax_count',
                'arrival_datetime',
                'departure_datetime'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('bus_id')->nullable()->constrained('buses')->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('seat_map')->nullable();
            $table->date('travel_date')->nullable();
            $table->string('pickup_location')->nullable();
            $table->string('tour_code')->nullable();
            $table->integer('pax_count')->nullable();
            $table->timestamp('arrival_datetime')->nullable();
            $table->timestamp('departure_datetime')->nullable();
        });

        // Restore data
        $bookings = DB::table('bookings')->get();
        foreach ($bookings as $booking) {
            DB::table('invoices')->where('id', $booking->invoice_id)->update([
                'bus_id' => $booking->bus_id,
                'driver_id' => $booking->driver_id,
                'seat_map' => $booking->seat_map,
                'travel_date' => $booking->travel_date,
                'pickup_location' => $booking->pickup_location,
                'tour_code' => $booking->tour_code,
                'pax_count' => $booking->pax_count,
                'arrival_datetime' => $booking->arrival_datetime,
                'departure_datetime' => $booking->departure_datetime,
            ]);

            DB::table('travels')
                ->where('reference_type', 'booking')
                ->where('reference_id', $booking->id)
                ->update([
                    'reference_type' => 'invoice',
                    'reference_id' => $booking->invoice_id,
                ]);
        }

        Schema::dropIfExists('bookings');
    }
};
