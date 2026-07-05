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
        Schema::create('travels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('travel_date');
            $table->string('duration')->nullable();
            $table->string('pick_up');
            $table->string('drop_off');
            $table->string('status');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type')->nullable(); // 'trip_ticket' or 'invoice'
            $table->string('travel_type')->default('local'); // 'local' or 'international'
            $table->timestamps();

            // Simple indexes for performance
            $table->index(['bus_id', 'travel_date']);
            $table->index(['driver_id', 'travel_date']);
        });

        // Add Partial Unique Indexes for availability checking
        // This ensures a driver or bus cannot be double-booked on the same day unless the travel is cancelled
        DB::statement('CREATE UNIQUE INDEX travels_bus_date_unique ON travels (bus_id, travel_date) WHERE status != \'cancelled\'');
        DB::statement('CREATE UNIQUE INDEX travels_driver_date_unique ON travels (driver_id, travel_date) WHERE driver_id IS NOT NULL AND status != \'cancelled\'');

        // Migrate data from old tables
        $locals = DB::table('local_travels')->get();
        foreach ($locals as $local) {
            DB::table('travels')->insertOrIgnore([
                'bus_id' => $local->bus_id,
                'driver_id' => $local->driver_id,
                'travel_date' => $local->travel_date,
                'duration' => $local->duration,
                'pick_up' => $local->pick_up,
                'drop_off' => $local->drop_off,
                'status' => $local->status,
                'reference_id' => $local->reference_id,
                'reference_type' => $local->reference_type,
                'travel_type' => 'local',
                'created_at' => $local->created_at,
                'updated_at' => $local->updated_at,
            ]);
        }

        $internationals = DB::table('international_travels')->get();
        foreach ($internationals as $intl) {
            DB::table('travels')->insertOrIgnore([
                'bus_id' => $intl->bus_id,
                'driver_id' => $intl->driver_id,
                'travel_date' => $intl->travel_date,
                'duration' => $intl->duration,
                'pick_up' => $intl->pick_up,
                'drop_off' => $intl->drop_off,
                'status' => $intl->status,
                'reference_id' => $intl->reference_id,
                'reference_type' => $intl->reference_type,
                'travel_type' => 'international',
                'created_at' => $intl->created_at,
                'updated_at' => $intl->updated_at,
            ]);
        }

        Schema::dropIfExists('international_travels');
        Schema::dropIfExists('local_travels');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('local_travels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('travel_date');
            $table->string('duration')->nullable();
            $table->string('pick_up');
            $table->string('drop_off');
            $table->string('status');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type')->nullable(); // 'trip_ticket' or 'invoice'
            $table->timestamps();

            $table->index(['bus_id', 'travel_date']);
            $table->index(['driver_id', 'travel_date']);
        });

        Schema::create('international_travels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('travel_date');
            $table->string('duration')->nullable();
            $table->string('pick_up');
            $table->string('drop_off');
            $table->string('status');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->timestamps();

            $table->index(['bus_id', 'travel_date']);
            $table->index(['driver_id', 'travel_date']);
        });

        $travels = DB::table('travels')->get();
        foreach ($travels as $travel) {
            $data = [
                'bus_id' => $travel->bus_id,
                'driver_id' => $travel->driver_id,
                'travel_date' => $travel->travel_date,
                'duration' => $travel->duration,
                'pick_up' => $travel->pick_up,
                'drop_off' => $travel->drop_off,
                'status' => $travel->status,
                'reference_id' => $travel->reference_id,
                'reference_type' => $travel->reference_type,
                'created_at' => $travel->created_at,
                'updated_at' => $travel->updated_at,
            ];
            if ($travel->travel_type === 'international') {
                DB::table('international_travels')->insert($data);
            } else {
                DB::table('local_travels')->insert($data);
            }
        }

        Schema::dropIfExists('travels');
    }
};
