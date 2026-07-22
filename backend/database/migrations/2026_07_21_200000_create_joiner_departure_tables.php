<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('joiner_departures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->string('code')->unique();
            $table->dateTimeTz('starts_at');
            $table->dateTimeTz('ends_at');
            $table->dateTimeTz('booking_cutoff_at');
            $table->string('timezone')->default('Asia/Manila');
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('held_count')->default(0);
            $table->unsignedInteger('confirmed_count')->default(0);
            $table->foreignId('bus_id')->nullable()->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('pickup_instructions')->nullable();
            $table->string('status')->default('draft');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['status', 'starts_at']);
        });

        Schema::create('joiner_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('departure_id')->constrained('joiner_departures')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->uuid('reference')->unique();
            $table->string('lead_name');
            $table->string('lead_email')->nullable();
            $table->string('lead_contact')->nullable();
            $table->unsignedInteger('passenger_count');
            $table->string('status')->default('held');
            $table->dateTimeTz('hold_expires_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['departure_id', 'status']);
        });

        Schema::create('joiner_departure_seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('departure_id')->constrained('joiner_departures')->cascadeOnDelete();
            $table->string('seat_code');
            $table->foreignId('reservation_id')->nullable()->constrained('joiner_reservations')->nullOnDelete();
            $table->string('status')->default('available');
            $table->dateTimeTz('held_until')->nullable();
            $table->timestamps();

            $table->unique(['departure_id', 'seat_code']);
            $table->index(['departure_id', 'status']);
        });

        Schema::create('joiner_passengers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('joiner_reservations')->cascadeOnDelete();
            $table->foreignId('departure_seat_id')->unique()->constrained('joiner_departure_seats')->restrictOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->text('special_needs')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('joiner_passengers');
        Schema::dropIfExists('joiner_departure_seats');
        Schema::dropIfExists('joiner_reservations');
        Schema::dropIfExists('joiner_departures');
    }
};

