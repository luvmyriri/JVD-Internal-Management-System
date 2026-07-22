<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('charter_rate_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->string('name');
            $table->string('vehicle_class');
            $table->decimal('base_price', 15, 2);
            $table->unsignedInteger('included_hours')->default(12);
            $table->unsignedInteger('included_kilometers')->default(100);
            $table->decimal('extra_hour_rate', 15, 2)->default(0);
            $table->decimal('extra_kilometer_rate', 15, 2)->default(0);
            $table->decimal('overnight_rate', 15, 2)->default(0);
            $table->boolean('includes_driver')->default(true);
            $table->boolean('includes_fuel')->default(true);
            $table->boolean('includes_tolls')->default(false);
            $table->boolean('includes_parking')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('charter_bookings', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('rate_plan_id')->constrained('charter_rate_plans')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('bus_id')->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('lead_name');
            $table->string('lead_email')->nullable();
            $table->string('lead_contact')->nullable();
            $table->dateTimeTz('starts_at');
            $table->dateTimeTz('ends_at');
            $table->string('pickup_location');
            $table->string('destination');
            $table->json('stops')->nullable();
            $table->unsignedInteger('passenger_count');
            $table->decimal('estimated_kilometers', 10, 2)->default(0);
            $table->decimal('base_price', 15, 2);
            $table->decimal('extra_hours_amount', 15, 2)->default(0);
            $table->decimal('extra_kilometers_amount', 15, 2)->default(0);
            $table->decimal('overnight_amount', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2);
            $table->json('pricing_snapshot');
            $table->string('status')->default('confirmed');
            $table->text('operations_notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['bus_id', 'starts_at', 'ends_at']);
            $table->index(['driver_id', 'starts_at', 'ends_at']);
            $table->index(['status', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charter_bookings');
        Schema::dropIfExists('charter_rate_plans');
    }
};

