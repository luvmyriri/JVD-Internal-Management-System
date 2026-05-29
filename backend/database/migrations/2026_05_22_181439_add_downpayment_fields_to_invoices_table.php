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
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('payment_type')->default('full')->after('payment_method');
            $table->decimal('balance', 15, 2)->default(0)->after('amount_received');
        });

        if (\DB::getDriverName() === 'pgsql') {
            \DB::statement("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check");
            \DB::statement("ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(255)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'balance']);
        });
    }
};
