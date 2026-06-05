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
        Schema::table('accreditations', function (Blueprint $table) {
            $table->json('custom_documents')->nullable()->after('terms_document_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accreditations', function (Blueprint $table) {
            $table->dropColumn('custom_documents');
        });
    }
};
