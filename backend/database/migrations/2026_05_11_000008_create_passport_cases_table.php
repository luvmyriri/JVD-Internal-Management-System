<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: PASSPORT_CASE entity — JVD_System_Architecture.pdf § 6.1
     * Flow: Requirements Gathering → Documents Complete → Submitted → Processing → Released
     * (See § 5.4 Passporting & Visa Processing Flow)
     */
    public function up(): void
    {
        Schema::create('passport_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('passenger_id')->constrained()->restrictOnDelete();
            $table->foreignId('handled_by')->constrained('users')->restrictOnDelete();
            $table->enum('case_type', ['passport', 'visa']);
            $table->enum('status', [
                'requirements_gathering',
                'documents_complete',
                'submitted_for_processing',
                'processing',
                'denied',
                'ready_for_release',
                'released',
            ])->default('requirements_gathering');
            $table->jsonb('checklist')->nullable();             // Document requirements checklist
            $table->string('reference_number')->nullable();     // DFA/Embassy reference
            $table->date('submitted_date')->nullable();
            $table->date('release_date')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('case_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passport_cases');
    }
};
