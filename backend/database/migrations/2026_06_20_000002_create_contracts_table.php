<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->string('contract_number')->unique();
            $table->string('status')->default('draft'); // draft, sent_for_signature, signed, declined, voided
            $table->longText('terms_snapshot'); // rendered contract terms text at time of generation (immutable audit copy)
            $table->decimal('deposit_required_percent', 5, 2)->nullable();
            $table->decimal('deposit_required_amount', 12, 2)->nullable();
            $table->string('cancellation_policy_key')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Customer e-signature capture
            $table->longText('signature_image')->nullable(); // base64 PNG data URI
            $table->string('signature_typed_name')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->string('signed_ip')->nullable();
            $table->string('signing_user_agent')->nullable();

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
