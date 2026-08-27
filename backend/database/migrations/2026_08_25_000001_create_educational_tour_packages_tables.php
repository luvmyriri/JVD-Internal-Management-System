<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_tour_packages', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('tour_code', 40)->unique();
            $table->foreignId('program_id')->nullable()->constrained('educational_tour_programs')->restrictOnDelete();
            $table->foreignId('school_customer_id')->nullable()->constrained('customers')->nullOnDelete();

            $table->string('name', 180);
            $table->string('school_name', 180);
            $table->string('grade_level', 100)->nullable();
            $table->text('description')->nullable();
            $table->text('learning_objectives')->nullable();
            $table->dateTimeTz('starts_at');
            $table->dateTimeTz('ends_at');
            $table->dateTimeTz('registration_opens_at')->nullable();
            $table->dateTimeTz('registration_closes_at')->nullable();
            $table->string('pickup_location', 255);
            $table->json('itinerary')->nullable();
            $table->json('inclusions')->nullable();
            $table->json('exclusions')->nullable();

            $table->unsignedInteger('maximum_capacity');
            $table->decimal('rate_per_head', 15, 2);
            $table->char('currency', 3)->default('PHP');
            $table->boolean('is_tax_inclusive')->default(false);
            $table->decimal('vat_rate', 6, 5)->default(0);
            $table->string('payment_policy', 24)->default('flexible');
            $table->decimal('down_payment_amount', 15, 2)->nullable();
            $table->unsignedInteger('installment_count')->nullable();
            $table->dateTimeTz('balance_due_at')->nullable();

            $table->char('registration_token_hash', 64)->unique();
            $table->string('status', 24)->default('draft');
            $table->text('operations_notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->dateTimeTz('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'starts_at']);
            $table->index(['school_customer_id', 'starts_at']);
        });

        Schema::create('educational_tour_bus_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('educational_tour_packages')->cascadeOnDelete();
            $table->foreignId('bus_id')->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('sequence_number');
            $table->unsignedInteger('capacity_snapshot');
            $table->string('status', 20)->default('planned');
            $table->dateTimeTz('assigned_at')->nullable();
            $table->dateTimeTz('released_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['package_id', 'sequence_number']);
            $table->unique(['package_id', 'bus_id']);
            $table->index(['package_id', 'status', 'sequence_number']);
        });

        Schema::create('educational_tour_participant_bookings', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('reference', 50)->unique();
            $table->char('access_token_hash', 64)->unique();
            $table->foreignId('package_id')->constrained('educational_tour_packages')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('invoice_id')->unique()->constrained('invoices')->restrictOnDelete();

            $table->string('participant_first_name', 100);
            $table->string('participant_middle_name', 100)->nullable();
            $table->string('participant_last_name', 100);
            $table->string('student_number', 100)->nullable();
            $table->string('grade_level', 100)->nullable();
            $table->string('section', 100)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('participant_email', 255)->nullable();
            $table->string('participant_phone', 30)->nullable();
            $table->string('guardian_name', 180)->nullable();
            $table->string('guardian_email', 255)->nullable();
            $table->string('guardian_phone', 30)->nullable();
            $table->string('emergency_contact_name', 180)->nullable();
            $table->string('emergency_contact_phone', 30)->nullable();
            $table->text('dietary_restrictions')->nullable();
            $table->text('medical_or_accessibility_notes')->nullable();

            $table->decimal('rate_snapshot', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('amount_due', 15, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('payment_plan', 20);
            $table->string('payment_status', 20)->default('unpaid');
            $table->string('status', 24)->default('pending_payment');

            $table->foreignId('bus_assignment_id')->nullable()->constrained('educational_tour_bus_assignments')->nullOnDelete();
            $table->string('seat_number', 30)->nullable();
            $table->dateTimeTz('booked_at');
            $table->dateTimeTz('slot_expires_at')->nullable();
            $table->dateTimeTz('confirmed_at')->nullable();
            $table->dateTimeTz('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->dateTimeTz('privacy_consent_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['package_id', 'status', 'booked_at']);
            $table->index(['package_id', 'student_number']);
            $table->index(['invoice_id']);
            $table->index(['bus_assignment_id', 'status']);
        });

        Schema::create('educational_tour_booking_payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->foreignId('booking_id')->constrained('educational_tour_participant_bookings')->restrictOnDelete();
            $table->foreignId('collection_payment_id')->nullable()->unique()->constrained('collection_payments')->restrictOnDelete();
            $table->unsignedInteger('installment_number')->nullable();
            $table->string('payment_kind', 20);
            $table->string('payment_method', 30);
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('status', 20)->default('pending');
            $table->string('provider_reference', 150)->nullable();
            $table->string('idempotency_key', 100)->unique();
            $table->dateTimeTz('paid_at')->nullable();
            $table->dateTimeTz('posted_at')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_tour_booking_payments');
        Schema::dropIfExists('educational_tour_participant_bookings');
        Schema::dropIfExists('educational_tour_bus_assignments');
        Schema::dropIfExists('educational_tour_packages');
    }
};
