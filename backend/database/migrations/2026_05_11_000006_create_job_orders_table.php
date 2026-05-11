<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: JOB_ORDER entity — JVD_System_Architecture.pdf § 6.1
     * Flow: Created → Confirmed → In Progress → Completed
     * (See § 5.2 J.O. Flow)
     */
    public function up(): void
    {
        Schema::create('job_orders', function (Blueprint $table) {
            $table->id();
            $table->string('jo_number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('bus_id')->nullable()->constrained('buses')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->enum('service_type', [
                'bus_rental',
                'field_trip',
                'corporate_transport',
                'travel_package',
                'event',
            ]);
            $table->enum('status', [
                'created',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
            ])->default('created');
            $table->date('service_date');
            $table->string('destination');
            $table->decimal('total_cost', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('service_date');
        });

        // Pivot table: JOB_ORDER includes PASSENGER
        Schema::create('job_order_passenger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('passenger_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['job_order_id', 'passenger_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_order_passenger');
        Schema::dropIfExists('job_orders');
    }
};
