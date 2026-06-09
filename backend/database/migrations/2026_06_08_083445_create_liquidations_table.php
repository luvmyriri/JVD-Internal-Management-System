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
        Schema::create('liquidations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_ticket_id')->nullable()->constrained('trip_tickets')->onDelete('set null');
            $table->foreignId('employee_id')->constrained('users')->onDelete('restrict');
            $table->string('status')->default('pending'); // pending, under_review, settled, disputed
            $table->decimal('total_advanced', 12, 2)->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->decimal('total_returned', 12, 2)->default(0);
            $table->decimal('shortage_amount', 12, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liquidations');
    }
};
