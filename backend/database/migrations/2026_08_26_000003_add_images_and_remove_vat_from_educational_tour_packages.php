<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_tour_packages', function (Blueprint $table) {
            $table->json('images')->nullable()->after('exclusions');
        });

        // Educational Tour rates are fixed per-head selling prices. Preserve every
        // customer's agreed total while removing VAT from current package records.
        DB::table('educational_tour_packages')->update([
            'is_tax_inclusive' => false,
            'vat_rate' => 0,
        ]);

        DB::table('educational_tour_participant_bookings')->update([
            'subtotal' => DB::raw('amount_due'),
            'tax_amount' => 0,
        ]);

        $invoiceIds = DB::table('educational_tour_participant_bookings')
            ->pluck('invoice_id')
            ->filter()
            ->all();

        if ($invoiceIds !== []) {
            DB::table('invoices')->whereIn('id', $invoiceIds)->update([
                'subtotal' => DB::raw('total_amount'),
                'tax_amount' => 0,
            ]);

            DB::table('invoice_items')->whereIn('invoice_id', $invoiceIds)->update([
                'unit_price' => DB::raw('CASE WHEN quantity > 0 THEN (SELECT total_amount FROM invoices WHERE invoices.id = invoice_items.invoice_id) / quantity ELSE total_price END'),
                'total_price' => DB::raw('(SELECT total_amount FROM invoices WHERE invoices.id = invoice_items.invoice_id)'),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('educational_tour_packages', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }
};
