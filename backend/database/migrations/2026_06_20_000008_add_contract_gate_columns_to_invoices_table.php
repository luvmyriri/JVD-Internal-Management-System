<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->boolean('requires_contract')->default(false)->after('status');
            // not_required, pending_signature, signed, bypassed
            $table->string('contract_gate_status')->default('not_required')->after('requires_contract');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['requires_contract', 'contract_gate_status']);
        });
    }
};
