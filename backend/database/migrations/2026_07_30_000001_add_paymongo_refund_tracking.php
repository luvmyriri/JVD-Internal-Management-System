<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collection_payments', function (Blueprint $table) {
            $table->string('paymongo_payment_id')->nullable()->index()->after('idempotency_key');
        });

        Schema::table('sales_refunds', function (Blueprint $table) {
            $table->string('provider_refund_id')->nullable()->unique()->after('destination_reference');
            $table->string('provider_status')->nullable()->index()->after('provider_refund_id');
            $table->text('provider_error')->nullable()->after('provider_status');
            $table->timestamp('processing_started_at')->nullable()->after('processed_at');
            $table->timestamp('provider_updated_at')->nullable()->after('processing_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('sales_refunds', function (Blueprint $table) {
            $table->dropUnique(['provider_refund_id']);
            $table->dropIndex(['provider_status']);
            $table->dropColumn([
                'provider_refund_id',
                'provider_status',
                'provider_error',
                'processing_started_at',
                'provider_updated_at',
            ]);
        });

        Schema::table('collection_payments', function (Blueprint $table) {
            $table->dropIndex(['paymongo_payment_id']);
            $table->dropColumn('paymongo_payment_id');
        });
    }
};
