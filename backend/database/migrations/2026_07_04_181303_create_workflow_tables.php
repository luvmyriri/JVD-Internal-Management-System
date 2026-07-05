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
        Schema::create('workflow_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('module')->unique(); // e.g., 'cash_budgets'
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('definition_id')->constrained('workflow_definitions')->cascadeOnDelete();
            $table->integer('order');
            $table->string('name');
            $table->string('approver_type'); // 'permission', 'role', 'user'
            $table->string('approver_value'); // e.g., 'cash_budgets:approve_accounting'
            $table->jsonb('condition_json')->nullable(); // e.g., {"amount_gt": 50000}
            $table->timestamps();

            $table->unique(['definition_id', 'order']);
        });

        Schema::create('workflow_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('definition_id')->constrained('workflow_definitions')->cascadeOnDelete();
            $table->string('subject_type'); // App\Models\CashBudgetRequest
            $table->unsignedBigInteger('subject_id');
            $table->integer('current_step');
            $table->string('status')->default('pending'); // 'pending', 'approved', 'rejected', 'returned', 'completed'
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
        });

        Schema::create('workflow_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instance_id')->constrained('workflow_instances')->cascadeOnDelete();
            $table->integer('step');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision'); // 'approved', 'rejected', 'returned'
            $table->text('comment')->nullable();
            $table->timestamp('acted_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_actions');
        Schema::dropIfExists('workflow_instances');
        Schema::dropIfExists('workflow_steps');
        Schema::dropIfExists('workflow_definitions');
    }
};
