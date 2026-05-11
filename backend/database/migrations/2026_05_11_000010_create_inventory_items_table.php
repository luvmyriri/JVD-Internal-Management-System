<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ER: INVENTORY_ITEM entity — JVD_System_Architecture.pdf § 6.1
     */
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_name');
            $table->string('category');
            $table->integer('quantity')->default(0);
            $table->integer('reorder_level')->default(0);       // Low-stock alert threshold
            $table->string('unit');                              // e.g., pcs, liters, kg
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->timestamps();

            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
