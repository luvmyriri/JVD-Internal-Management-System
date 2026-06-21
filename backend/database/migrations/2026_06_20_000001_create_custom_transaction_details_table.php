<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_transaction_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->unique()->constrained('invoices')->onDelete('cascade');
            $table->string('category'); // Bus Rental, Educational Tour, Tour Package, Visa Processing, Joiners, Booking, Other

            // Bus Rental
            $table->string('vehicle_type')->nullable();
            $table->string('route')->nullable();
            $table->unsignedSmallInteger('rental_days')->default(1);
            $table->string('plate_number')->nullable();
            $table->boolean('inclusion_driver')->default(false);
            $table->boolean('inclusion_fuel')->default(false);
            $table->boolean('inclusion_toll')->default(false);
            $table->boolean('inclusion_insurance')->default(false);

            // Educational Tour
            $table->string('school_name')->nullable();
            $table->string('grade_level')->nullable();
            $table->unsignedInteger('expected_pax')->nullable();
            $table->text('itinerary_stops')->nullable();
            $table->boolean('edu_inclusion_meals')->default(false);
            $table->boolean('edu_inclusion_coordinator')->default(false);
            $table->boolean('edu_inclusion_insurance')->default(false);
            $table->boolean('edu_inclusion_tshirt')->default(false);

            // Tour Package
            $table->string('destination')->nullable();
            $table->string('accommodation_type')->nullable();

            // Visa Processing
            $table->string('visa_country')->nullable();
            $table->string('visa_type')->nullable();
            $table->boolean('visa_req_passport')->default(false);
            $table->boolean('visa_req_photo')->default(false);
            $table->boolean('visa_req_bank_cert')->default(false);
            $table->boolean('visa_req_itr')->default(false);
            $table->boolean('visa_req_birth_cert')->default(false);

            // Joiners
            $table->string('joiner_tour_code')->nullable();

            // Booking
            $table->string('booking_type')->nullable();
            $table->string('booking_reference_code')->nullable();
            $table->text('booking_details')->nullable();

            // Catch-all for "Other" category / forward-compat
            $table->json('category_meta')->nullable();
            $table->text('additional_remarks')->nullable();

            $table->timestamps();

            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_transaction_details');
    }
};
