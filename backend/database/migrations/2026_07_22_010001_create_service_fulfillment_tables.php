<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function base(Blueprint $table): void
    {
        $table->id();
        $table->foreignId('sales_order_item_id')->unique()->constrained()->cascadeOnDelete();
        $table->string('status')->default('draft')->index();
    }

    public function up(): void
    {
        Schema::create('private_tour_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->string('package_name');
            $table->string('destination');
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->unsignedInteger('passenger_count');
            $table->string('pickup_location')->nullable();
            $table->foreignId('bus_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('itinerary');
            $table->json('inclusions')->nullable();
            $table->json('exclusions')->nullable();
            $table->text('special_requests')->nullable();
            $table->timestamps();
        });

        Schema::create('visa_assistance_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('passport_case_id')->nullable()->constrained()->nullOnDelete();
            $table->string('applicant_name');
            $table->string('destination_country');
            $table->string('visa_type');
            $table->string('travel_purpose')->nullable();
            $table->date('intended_departure')->nullable();
            $table->dateTime('appointment_at')->nullable();
            $table->string('passport_number')->nullable();
            $table->json('requirements_snapshot')->nullable();
            $table->timestamps();
        });

        Schema::create('passport_assistance_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('passport_case_id')->nullable()->constrained()->nullOnDelete();
            $table->string('applicant_name');
            $table->string('application_type');
            $table->dateTime('appointment_at')->nullable();
            $table->string('site')->nullable();
            $table->date('target_release_date')->nullable();
            $table->json('requirements_snapshot')->nullable();
            $table->timestamps();
        });

        Schema::create('flight_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('trip_type');
            $table->string('origin', 10);
            $table->string('destination', 10);
            $table->dateTime('departure_at')->index();
            $table->dateTime('return_at')->nullable();
            $table->string('airline')->nullable();
            $table->string('flight_number')->nullable();
            $table->string('pnr')->nullable()->index();
            $table->string('fare_class')->nullable();
            $table->string('baggage_allowance')->nullable();
            $table->dateTime('ticketing_deadline')->nullable();
            $table->unsignedInteger('passenger_count');
            $table->json('passengers');
            $table->json('fare_conditions')->nullable();
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('accommodation_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('property_name');
            $table->string('city');
            $table->date('check_in')->index();
            $table->date('check_out');
            $table->string('room_type');
            $table->unsignedInteger('room_count');
            $table->unsignedInteger('adult_count');
            $table->unsignedInteger('child_count')->default(0);
            $table->string('confirmation_number')->nullable()->index();
            $table->dateTime('free_cancellation_until')->nullable();
            $table->json('guest_names');
            $table->json('meal_plan')->nullable();
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('scheduled_ticket_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('transport_mode');
            $table->string('operator_name');
            $table->string('origin');
            $table->string('destination');
            $table->dateTime('departure_at')->index();
            $table->dateTime('arrival_at')->nullable();
            $table->string('booking_reference')->nullable()->index();
            $table->unsignedInteger('passenger_count');
            $table->json('passengers');
            $table->json('seat_assignments')->nullable();
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('activity_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('activity_name');
            $table->string('location');
            $table->dateTime('session_starts_at')->index();
            $table->dateTime('session_ends_at')->nullable();
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('participant_count');
            $table->string('supplier_reference')->nullable();
            $table->json('participants')->nullable();
            $table->json('requirements')->nullable();
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('transfer_bookings', function (Blueprint $table) {
            $this->base($table);
            $table->dateTime('pickup_at')->index();
            $table->dateTime('dropoff_at')->nullable();
            $table->string('pickup_location');
            $table->string('dropoff_location');
            $table->unsignedInteger('passenger_count');
            $table->unsignedInteger('luggage_count')->default(0);
            $table->foreignId('bus_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('flight_or_trip_reference')->nullable();
            $table->json('passenger_names')->nullable();
            $table->text('dispatch_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('custom_arrangement_items', function (Blueprint $table) {
            $this->base($table);
            $table->string('arrangement_name');
            $table->text('requirements');
            $table->dateTime('target_starts_at')->nullable();
            $table->dateTime('target_ends_at')->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('supplier_reference')->nullable();
            $table->json('deliverables');
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['custom_arrangement_items', 'transfer_bookings', 'activity_bookings', 'scheduled_ticket_bookings', 'accommodation_bookings', 'flight_bookings', 'passport_assistance_bookings', 'visa_assistance_bookings', 'private_tour_bookings'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
