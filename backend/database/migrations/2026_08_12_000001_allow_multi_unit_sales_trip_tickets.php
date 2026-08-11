<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropUnique('trip_tickets_sales_order_item_id_unique');
            $table->unsignedInteger('assignment_index')->default(0)->after('sales_order_item_id');
            $table->unique(['sales_order_item_id', 'assignment_index'], 'trip_tickets_sales_item_assignment_unique');
        });
    }

    public function down(): void
    {
        Schema::table('trip_tickets', function (Blueprint $table) {
            $table->dropUnique('trip_tickets_sales_item_assignment_unique');
            $table->dropColumn('assignment_index');
            $table->unique('sales_order_item_id');
        });
    }
};
