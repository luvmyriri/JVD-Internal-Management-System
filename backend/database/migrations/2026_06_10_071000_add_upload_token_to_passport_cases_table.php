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
        Schema::table('passport_cases', function (Blueprint $table) {
            $table->string('upload_token', 64)->nullable()->unique()->after('reference_number');
            $table->jsonb('upload_requested_docs')->nullable()->after('upload_token');
            $table->timestamp('upload_email_sent_at')->nullable()->after('upload_requested_docs');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('passport_cases', function (Blueprint $table) {
            $table->dropColumn(['upload_token', 'upload_requested_docs', 'upload_email_sent_at']);
        });
    }
};
