<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('document_delivery_status', 20)->nullable();
            $table->string('document_delivery_recipient')->nullable();
            $table->timestampTz('document_delivery_queued_at')->nullable();
            $table->timestampTz('document_delivery_sent_at')->nullable();
            $table->timestampTz('document_delivery_failed_at')->nullable();
            $table->text('document_delivery_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', fn (Blueprint $table) => $table->dropColumn([
            'document_delivery_status', 'document_delivery_recipient', 'document_delivery_queued_at',
            'document_delivery_sent_at', 'document_delivery_failed_at', 'document_delivery_error',
        ]));
    }
};
