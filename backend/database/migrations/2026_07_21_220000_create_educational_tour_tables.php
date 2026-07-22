<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_tour_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->string('name');
            $table->text('learning_objectives')->nullable();
            $table->json('default_stops');
            $table->unsignedInteger('minimum_students')->default(20);
            $table->unsignedInteger('students_per_chaperone')->default(20);
            $table->unsignedInteger('students_per_free_chaperone')->default(20);
            $table->decimal('student_price', 15, 2);
            $table->decimal('additional_chaperone_price', 15, 2)->default(0);
            $table->boolean('includes_meals')->default(true);
            $table->boolean('includes_coordinator')->default(true);
            $table->boolean('includes_insurance')->default(true);
            $table->boolean('includes_shirt')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('educational_tour_bookings', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('program_id')->constrained('educational_tour_programs')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('school_name');
            $table->string('contact_person');
            $table->string('contact_email')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('grade_level');
            $table->dateTimeTz('starts_at');
            $table->dateTimeTz('ends_at');
            $table->string('pickup_location');
            $table->json('stops_snapshot');
            $table->unsignedInteger('student_count');
            $table->unsignedInteger('chaperone_count');
            $table->unsignedInteger('free_chaperone_count');
            $table->unsignedInteger('chargeable_chaperone_count');
            $table->decimal('student_amount', 15, 2);
            $table->decimal('chaperone_amount', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->json('pricing_snapshot');
            $table->string('status')->default('confirmed');
            $table->text('operations_notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['status', 'starts_at']);
        });

        Schema::create('educational_tour_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('educational_tour_bookings')->cascadeOnDelete();
            $table->foreignId('bus_id')->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('capacity_snapshot');
            $table->unsignedInteger('planned_passengers')->default(0);
            $table->timestamps();
            $table->unique(['booking_id', 'bus_id']);
            $table->unique(['booking_id', 'driver_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_tour_vehicles');
        Schema::dropIfExists('educational_tour_bookings');
        Schema::dropIfExists('educational_tour_programs');
    }
};

