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
        Schema::table('job_orders', function (Blueprint $table) {
            $table->string('brand')->nullable();
            $table->string('plate_no')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('body_number')->nullable();
            $table->date('date_started')->nullable();
            $table->date('date_ended')->nullable();
            $table->text('remarks')->nullable();
            $table->text('work_description')->nullable();
            $table->text('order_details')->nullable();
            $table->foreignId('supervised_by')->nullable()->constrained('users');
            $table->foreignId('checked_by')->nullable()->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            //
        });
    }
};
