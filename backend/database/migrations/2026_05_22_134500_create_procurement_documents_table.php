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
        Schema::create('procurement_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('document_type'); // e.g. receipt, invoice, delivery_note, agreement, other
            $table->string('file_path');
            $table->decimal('amount', 15, 2)->nullable();
            
            // Connected Entities (all fully optional for dynamic combinations)
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->onDelete('cascade');
            $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->onDelete('cascade');
            $table->foreignId('driver_id')->nullable()->constrained('users')->onDelete('cascade');
            
            // Associated Transactions
            $table->string('transaction_type')->nullable(); // e.g. purchase_order, job_order, general
            $table->unsignedBigInteger('transaction_id')->nullable();
            
            // Customizable JSON metadata container
            $table->json('custom_metadata')->nullable();
            
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Indexes for lightning fast searching and cross-referencing
            $table->index('supplier_id');
            $table->index('inventory_item_id');
            $table->index('driver_id');
            $table->index(['transaction_type', 'transaction_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procurement_documents');
    }
};
