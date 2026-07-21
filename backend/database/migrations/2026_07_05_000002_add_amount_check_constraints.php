<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Roadmap 2.8b — CHECK constraints on money columns (defense-in-depth against
 * negative amounts reaching the DB even if application validation is bypassed).
 *
 * Applied on PostgreSQL (production) only. SQLite — used for the in-memory test
 * database — cannot add CHECK constraints via ALTER TABLE, and app-level
 * validation already guards these paths in tests, so we no-op there.
 */
return new class extends Migration
{
    private array $constraints = [
        ['invoices', 'chk_invoices_total_nonneg', 'total_amount >= 0'],
        ['invoices', 'chk_invoices_subtotal_nonneg', 'subtotal >= 0'],
        ['invoices', 'chk_invoices_tax_nonneg', 'tax_amount >= 0'],
        ['collection_payments', 'chk_collpay_amount_nonneg', 'amount >= 0'],
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->constraints as [$table, $name, $check]) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$check})");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->constraints as [$table, $name, $check]) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$name}");
        }
    }
};
