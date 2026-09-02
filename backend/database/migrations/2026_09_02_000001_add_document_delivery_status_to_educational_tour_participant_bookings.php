<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_tour_participant_bookings', function (Blueprint $table) {
            $table->string('document_delivery_status', 20)->nullable()->after('payment_status');
            $table->string('document_delivery_recipient')->nullable()->after('document_delivery_status');
            $table->dateTimeTz('document_delivery_queued_at')->nullable()->after('document_delivery_recipient');
            $table->dateTimeTz('document_delivery_sent_at')->nullable()->after('document_delivery_queued_at');
            $table->dateTimeTz('document_delivery_failed_at')->nullable()->after('document_delivery_sent_at');
            $table->text('document_delivery_error')->nullable()->after('document_delivery_failed_at');
        });
    }

    public function down(): void
    {
        Schema::table('educational_tour_participant_bookings', function (Blueprint $table) {
            $table->dropColumn([
                'document_delivery_status',
                'document_delivery_recipient',
                'document_delivery_queued_at',
                'document_delivery_sent_at',
                'document_delivery_failed_at',
                'document_delivery_error',
            ]);
        });
    }
};
