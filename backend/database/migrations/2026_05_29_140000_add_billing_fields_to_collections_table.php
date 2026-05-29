<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            // Link to source invoice (nullable — manual collections have no invoice)
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete()->after('id');

            // Financial tracking fields
            $table->decimal('billing_amount', 15, 2)->default(0)->after('rate');
            $table->decimal('paid_amount', 15, 2)->default(0)->after('billing_amount');
            $table->decimal('remaining_balance', 15, 2)->default(0)->after('paid_amount');

            // Due date: the travel/service date — payment must be completed before this date
            $table->date('due_date')->nullable()->after('remaining_balance');

            // Granular collection lifecycle status
            $table->string('collection_status')->default('pending')->after('due_date');
            // Values: pending | partial | overdue | completed

            // Free-form notes for collection staff
            $table->text('remarks')->nullable()->after('collection_status');

            // Flag to distinguish auto-generated (from billing) vs manually created
            $table->boolean('auto_generated')->default(false)->after('remarks');
        });
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->dropColumn([
                'invoice_id',
                'billing_amount',
                'paid_amount',
                'remaining_balance',
                'due_date',
                'collection_status',
                'remarks',
                'auto_generated',
            ]);
        });
    }
};
