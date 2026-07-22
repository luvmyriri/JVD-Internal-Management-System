<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_order_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('adjustment_number')->unique();
            $table->string('type')->index();
            $table->string('status')->default('pending_approval')->index();
            $table->text('reason');
            $table->decimal('amount', 15, 2)->default(0);
            $table->json('change_set')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('effective_at')->nullable();
            $table->timestamps();
        });

        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->string('credit_note_number')->unique();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->foreignId('sales_order_adjustment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('draft')->index();
            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->text('reason');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_refunds', function (Blueprint $table) {
            $table->id();
            $table->string('refund_number')->unique();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->foreignId('credit_note_id')->constrained()->restrictOnDelete();
            $table->string('status')->default('pending_approval')->index();
            $table->decimal('amount', 15, 2);
            $table->string('refund_method');
            $table->string('destination_reference')->nullable();
            $table->text('reason');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_refunds');
        Schema::dropIfExists('credit_notes');
        Schema::dropIfExists('sales_order_adjustments');
    }
};
