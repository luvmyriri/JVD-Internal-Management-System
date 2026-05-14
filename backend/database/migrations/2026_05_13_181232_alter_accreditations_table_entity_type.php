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
            // Change entity_type to string since Postgres enum modification is tricky
            $table->string('entity_type')->change();
            
            // Add required KYC / compliance fields
            $table->string('nda_document_url')->nullable();
            $table->string('terms_document_url')->nullable();
            $table->string('kyc_document_url')->nullable();
            $table->string('entity_name')->nullable(); // Helper field
            $table->string('contact_person')->nullable();
            $table->string('contact_email')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('accreditations', function (Blueprint $table) {
            $table->dropColumn(['nda_document_url', 'terms_document_url', 'kyc_document_url', 'entity_name', 'contact_person', 'contact_email']);
        });
    }
};
