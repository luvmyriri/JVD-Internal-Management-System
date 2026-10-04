<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sales_quotations')
            ->where('status', 'draft')
            ->where('vat_amount', '>', 0)
            ->update([
                'vat_amount' => 0,
                'vat_rate' => 0,
                'total' => DB::raw('subtotal'),
            ]);
    }

    public function down(): void
    {
        // The original VAT values cannot be recovered after correcting drafts.
    }
};
