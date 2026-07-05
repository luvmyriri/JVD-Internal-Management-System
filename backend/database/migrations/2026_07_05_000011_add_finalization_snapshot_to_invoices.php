<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Roadmap 2.5 — finalization snapshots. Freezes an invoice's financial facts
 * (line items, prices, customer details as sold, totals) at finalization so later
 * edits to services/prices/customer records can never rewrite billed history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->json('finalized_snapshot')->nullable()->after('notes');
            $table->timestamp('finalized_at')->nullable()->after('finalized_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['finalized_snapshot', 'finalized_at']);
        });
    }
};
