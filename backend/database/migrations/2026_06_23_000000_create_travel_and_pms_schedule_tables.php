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

        Schema::create('pms_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();
            $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->nullOnDelete();
            $table->date('maintenance_date');
            $table->string('duration')->nullable();
            $table->string('status');
            $table->text('description');
            $table->timestamps();

            $table->index(['bus_id', 'maintenance_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pms_schedules');
        Schema::dropIfExists('international_travels');
        Schema::dropIfExists('local_travels');
    }
};
