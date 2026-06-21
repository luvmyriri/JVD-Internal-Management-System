<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->unsignedInteger('installment_number');
            $table->date('due_date');
            $table->decimal('amount_due', 12, 2);
            // pending, due, overdue, reconciled, waived — reconciled means the Collections/CollectionPayment
            // ledger shows enough payment to satisfy this installment; this table never records money itself.
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['invoice_id', 'installment_number']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_schedules');
    }
};
