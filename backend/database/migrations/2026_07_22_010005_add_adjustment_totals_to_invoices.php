<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('credited_amount', 15, 2)->default(0)->after('balance');
            $table->decimal('refunded_amount', 15, 2)->default(0)->after('credited_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', fn (Blueprint $table) => $table->dropColumn(['credited_amount','refunded_amount']));
    }
};
