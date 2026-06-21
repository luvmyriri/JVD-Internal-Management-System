<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_amendments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('contracts')->onDelete('cascade');
            $table->unsignedInteger('amendment_number');
            $table->text('reason');
            $table->longText('changes_summary');
            $table->longText('terms_snapshot');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Re-signature capture (optional per amendment)
            $table->longText('signature_image')->nullable();
            $table->string('signature_typed_name')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->string('signed_ip')->nullable();

            $table->timestamps();

            $table->unique(['contract_id', 'amendment_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_amendments');
    }
};
