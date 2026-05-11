<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: ACCREDITATION entity — JVD_System_Architecture.pdf § 6.1
     * Polymorphic: entity_type can be 'company', 'driver', or 'bus'
     */
    public function up(): void
    {
        Schema::create('accreditations', function (Blueprint $table) {
            $table->id();
            $table->enum('entity_type', ['company', 'driver', 'bus']);
            $table->unsignedBigInteger('entity_id');            // FK to users (driver) or buses (bus)
            $table->string('accreditation_type');                // e.g., LTFRB, DOT, insurance
            $table->string('issuing_body');
            $table->date('issue_date');
            $table->date('expiry_date');
            $table->enum('status', ['active', 'expired', 'pending_renewal'])->default('active');
            $table->string('document_url')->nullable();         // Uploaded document path
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('expiry_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accreditations');
    }
};
