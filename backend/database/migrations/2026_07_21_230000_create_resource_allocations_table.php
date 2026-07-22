<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source_type');
            $table->unsignedBigInteger('source_id');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status')->default('confirmed');
            $table->string('reference')->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_id', 'bus_id'], 'resource_allocation_source_bus_unique');
            $table->index(['bus_id', 'starts_at', 'ends_at'], 'resource_allocation_bus_window');
            $table->index(['driver_id', 'starts_at', 'ends_at'], 'resource_allocation_driver_window');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_allocations');
    }
};
