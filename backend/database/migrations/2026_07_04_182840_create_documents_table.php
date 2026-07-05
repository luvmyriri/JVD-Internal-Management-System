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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('doc_number')->unique(); // e.g. JVD-DOC-2026-00001
            $table->string('title');
            $table->foreignId('category_id')->nullable()->constrained('document_categories')->nullOnDelete();
            $table->json('tags')->nullable();
            
            $table->enum('storage_type', ['soft', 'hard', 'both'])->default('soft');
            
            // Soft copy fields
            $table->string('file_path')->nullable();
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->nullable(); // Bytes
            $table->string('checksum')->nullable();
            
            // Hard copy fields
            $table->string('physical_location')->nullable();
            $table->foreignId('custodian_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Dates
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('retention_until')->nullable();
            
            $table->string('status')->default('active'); // draft, active, archived, disposed
            $table->string('source')->default('uploaded'); // uploaded, generated, portal
            
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('document_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->morphs('linkable'); // linkable_type, linkable_id
            $table->timestamps();
            
            $table->unique(['document_id', 'linkable_type', 'linkable_id'], 'doc_link_unique');
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->integer('version')->default(1);
            $table->string('file_path');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->unique(['document_id', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('document_links');
        Schema::dropIfExists('documents');
    }
};
