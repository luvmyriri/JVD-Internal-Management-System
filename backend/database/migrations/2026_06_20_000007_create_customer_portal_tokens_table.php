<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_portal_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->string('purpose'); // document_upload, contract_signature
            $table->string('related_type'); // PassportCase, Accreditation, Contract, ContractAmendment
            $table->unsignedBigInteger('related_id');
            $table->json('requested_docs')->nullable(); // document_upload: array of requested doc titles
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('consumed_at')->nullable(); // set on contract sign (one-time); null/reusable for uploads
            $table->timestamps();

            $table->index(['related_type', 'related_id']);
            $table->index('purpose');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_portal_tokens');
    }
};
