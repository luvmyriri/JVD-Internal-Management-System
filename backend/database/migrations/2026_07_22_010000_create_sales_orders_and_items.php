<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('supersedes_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->string('status')->default('draft')->index();
            $table->string('currency', 3)->default('PHP');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->dateTime('travel_starts_at')->nullable()->index();
            $table->dateTime('travel_ends_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_number');
            $table->string('service_type')->index();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->nullableMorphs('fulfillment');
            $table->string('status')->default('draft')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('supplier_cost', 15, 2)->nullable();
            $table->dateTime('scheduled_start')->nullable()->index();
            $table->dateTime('scheduled_end')->nullable();
            $table->unsignedInteger('traveler_count')->nullable();
            $table->json('details_snapshot')->nullable();
            $table->timestamps();
            $table->unique(['sales_order_id', 'line_number']);
        });

        Schema::create('sales_order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type')->index();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->json('payload')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_events');
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
    }
};
