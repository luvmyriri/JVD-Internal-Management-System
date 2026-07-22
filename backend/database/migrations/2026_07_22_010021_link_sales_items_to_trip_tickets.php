<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->foreignId('sales_order_item_id')
                ->nullable()
                ->unique()
                ->after('invoice_id')
                ->constrained('sales_order_items')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sales_order_item_id');
        });
    }
};
