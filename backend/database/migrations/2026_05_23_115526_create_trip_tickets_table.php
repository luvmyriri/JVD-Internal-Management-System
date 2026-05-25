<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('trip_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('control_no')->unique();
            $table->date('issue_date');
            $table->date('date_of_travel');
            $table->string('duration')->nullable();
            $table->string('pick_up');
            $table->string('drop_off');
            $table->foreignId('bus_id')->nullable()->constrained('buses');
            $table->string('plate_no')->nullable();
            $table->integer('no_of_passengers')->default(0);
            $table->foreignId('driver_id')->nullable()->constrained('users');
            
            // Liquidation
            $table->decimal('meal_allowance', 10, 2)->default(0);
            $table->decimal('diesel', 10, 2)->default(0);
            $table->decimal('sop', 10, 2)->default(0);
            $table->decimal('easy_trip', 10, 2)->default(0);
            $table->decimal('autosweep', 10, 2)->default(0);
            
            // Metrics
            $table->decimal('fuel_consumed', 10, 2)->default(0);
            $table->string('fuel_gauge_before')->nullable();
            $table->string('fuel_gauge_after')->nullable();
            $table->decimal('odometer_reading', 12, 2)->default(0);
            
            // Passenger Certification
            $table->enum('passenger_rating', ['outstanding', 'satisfactory', 'needs_improvement', 'poor'])->nullable();
            $table->string('passenger_name')->nullable();
            
            $table->foreignId('requested_by')->nullable()->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->enum('status', ['draft', 'approved', 'completed'])->default('draft');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_tickets');
    }
};
