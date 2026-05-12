<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Business Rule: Boss requirement — each PO line item must capture the
     * part number to enable supplier cross-check and counter-verification of
     * all purchased parts (critical for vehicle maintenance audit trail).
     *
     * Also adds unit_of_measure and receipt_number for full receipt traceability.
     */
    public function up(): void
    {
        Schema::table('po_line_items', function (Blueprint $table) {
            // Part number for supplier cross-check (boss-mandated critical field)
            $table->string('part_number')->nullable()->after('item_name');
            // Unit of measure (pcs, liters, meters, etc.)
            $table->string('unit_of_measure')->nullable()->after('quantity');
            // Receipt/delivery reference number for counter-checking purchased parts
            $table->string('receipt_number')->nullable()->after('total_price');
            // Notes for this line item (brand, spec, etc.)
            $table->text('item_notes')->nullable()->after('receipt_number');

            $table->index('part_number');
        });
    }

    public function down(): void
    {
        Schema::table('po_line_items', function (Blueprint $table) {
            $table->dropIndex(['part_number']);
            $table->dropColumn(['part_number', 'unit_of_measure', 'receipt_number', 'item_notes']);
        });
    }
};
