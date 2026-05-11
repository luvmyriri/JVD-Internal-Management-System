<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: AUDIT_LOG entity — JVD_System_Architecture.pdf § 6.1
     * Security requirement: non-editable, comprehensive action log
     * (See § 8.3 — "Every create, update, delete, and approval action logged")
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('action');                           // POST, PUT, PATCH, DELETE, or custom
            $table->string('module');                           // purchase-orders, job-orders, etc.
            $table->string('entity_type');                      // Model class or table name
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->string('ip_address', 45);
            $table->timestamp('created_at');

            // No updated_at — audit logs are immutable
            $table->index('user_id');
            $table->index('module');
            $table->index('created_at');
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
