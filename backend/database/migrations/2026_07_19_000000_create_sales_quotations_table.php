<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customer-facing sales quotations (the printable "Official Quotation").
 * Distinct from the existing `quotations` table, which is an internal
 * bus-trip costing sheet (rates/diesel/mark-up/net income), not a client document.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number')->unique();

            // Recipient ("Quotation To") — snapshot so a reprint is stable even if
            // the customer record later changes. customer_id links to an existing
            // customer when one was picked.
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('client_name');
            $table->string('client_company')->nullable();
            $table->string('client_address')->nullable();
            $table->string('client_contact')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_tin')->nullable();

            // What was quoted (snapshot).
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->string('service_name')->nullable();
            $table->string('category')->nullable();
            $table->json('line_items'); // [{description, unit_price, quantity, amount}]
            $table->text('description')->nullable();
            $table->text('inclusions')->nullable();
            $table->text('exclusions')->nullable();

            // Money — VAT-inclusive prices are decomposed into a BIR-standard breakdown.
            $table->decimal('subtotal', 15, 2);      // VAT-exclusive
            $table->decimal('vat_amount', 15, 2);
            $table->decimal('total', 15, 2);          // Grand total including VAT
            $table->decimal('vat_rate', 5, 2)->default(12);

            $table->date('travel_date')->nullable();
            $table->date('valid_until');
            $table->string('status')->default('draft'); // draft | sent | accepted | expired
            $table->text('notes')->nullable();

            $table->foreignId('prepared_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_quotations');
    }
};
