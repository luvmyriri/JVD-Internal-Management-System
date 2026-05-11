<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: BUS entity — JVD_System_Architecture.pdf § 6.1
     */
    public function up(): void
    {
        Schema::create('buses', function (Blueprint $table) {
            $table->id();
            $table->string('plate_number')->unique();
            $table->string('model');
            $table->integer('seating_capacity');
            $table->enum('status', ['available', 'in_service', 'under_maintenance', 'decommissioned'])
                  ->default('available');
            $table->float('total_mileage')->default(0);
            $table->date('last_service_date')->nullable();
            $table->date('next_service_due')->nullable();
            $table->foreignId('assigned_driver')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buses');
    }
};
