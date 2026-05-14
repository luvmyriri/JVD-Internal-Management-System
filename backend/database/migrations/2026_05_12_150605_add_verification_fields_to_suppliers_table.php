<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Business Rule: Suppliers must be cross-checked and counter-checked
     * before a PO can be issued. (Boss mandate: "SUPPLIER CROSS AND COUNTER CHECKED")
     *
     * Adds:
     *  - is_verified: flag set by accounting after manual cross-check
     *  - verified_by: who performed the verification
     *  - payment_terms: monthly payment / consignment arrangement details
     *  - bank_details: for payment processing
     *  - tin_number: tax identification for compliance
     */
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            // Cross-check/counter-check verification (boss-mandated)
            $table->boolean('is_verified')->default(false)->after('address');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete()->after('is_verified');
            $table->timestamp('verified_at')->nullable()->after('verified_by');

            // Monthly payment / consignment terms (boss: "monthly payment, confinement")
            $table->text('payment_terms')->nullable()->after('verified_at')
                  ->comment('e.g., Net 30, Monthly consignment, COD');
            $table->boolean('is_consignment')->default(false)->after('payment_terms');

            // Financial and compliance fields
            $table->string('bank_name')->nullable()->after('is_consignment');
            $table->string('bank_account_number')->nullable()->after('bank_name');
            $table->string('tin_number')->nullable()->after('bank_account_number');

            // Accreditation status for suppliers (links to accreditation module)
            $table->enum('accreditation_status', ['pending', 'accredited', 'suspended', 'blacklisted'])
                  ->default('pending')->after('tin_number');

            $table->index('is_verified');
            $table->index('accreditation_status');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['is_verified', 'accreditation_status']);
            $table->dropColumn([
                'is_verified', 'verified_by', 'verified_at',
                'payment_terms', 'is_consignment',
                'bank_name', 'bank_account_number', 'tin_number',
                'accreditation_status',
            ]);
        });
    }
};
