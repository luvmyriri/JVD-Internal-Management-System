<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->id(); $table->string('run_number')->unique(); $table->date('as_of_date')->index();
            $table->string('status')->default('running')->index(); $table->unsignedInteger('checked_records')->default(0);
            $table->unsignedInteger('exception_count')->default(0); $table->json('summary')->nullable();
            $table->foreignId('run_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamp('completed_at')->nullable(); $table->timestamps();
        });
        Schema::create('reconciliation_exceptions', function (Blueprint $table) {
            $table->id(); $table->foreignId('reconciliation_run_id')->constrained()->cascadeOnDelete();
            $table->string('category')->index(); $table->string('severity')->default('error')->index();
            $table->nullableMorphs('reference'); $table->text('message'); $table->decimal('expected_amount',15,2)->nullable();
            $table->decimal('actual_amount',15,2)->nullable(); $table->string('status')->default('open')->index();
            $table->text('resolution')->nullable(); $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable(); $table->timestamps();
        });
        Schema::create('opening_balance_batches', function (Blueprint $table) {
            $table->id(); $table->string('batch_number')->unique(); $table->date('as_of_date'); $table->string('status')->default('draft')->index();
            $table->text('notes'); $table->decimal('total_debits',15,2)->default(0); $table->decimal('total_credits',15,2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamp('approved_at')->nullable(); $table->timestamp('posted_at')->nullable(); $table->timestamps();
        });
        Schema::create('opening_balance_lines', function (Blueprint $table) {
            $table->id(); $table->foreignId('opening_balance_batch_id')->constrained()->cascadeOnDelete(); $table->foreignId('account_id')->constrained()->restrictOnDelete();
            $table->decimal('debit',15,2)->default(0); $table->decimal('credit',15,2)->default(0); $table->string('description'); $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('opening_balance_lines'); Schema::dropIfExists('opening_balance_batches');
        Schema::dropIfExists('reconciliation_exceptions'); Schema::dropIfExists('reconciliation_runs');
    }
};
