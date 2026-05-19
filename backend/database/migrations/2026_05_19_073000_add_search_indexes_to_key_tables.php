<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->index('first_name');
            $table->index('last_name');
            $table->index('email');
        });

        Schema::table('passengers', function (Blueprint $table) {
            $table->index('first_name');
            $table->index('last_name');
            $table->index('customer_id');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index('supplier_id');
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $table->index('customer_id');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['first_name']);
            $table->dropIndex(['last_name']);
            $table->dropIndex(['email']);
        });

        Schema::table('passengers', function (Blueprint $table) {
            $table->dropIndex(['first_name']);
            $table->dropIndex(['last_name']);
            $table->dropIndex(['customer_id']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex(['supplier_id']);
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropIndex(['customer_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['customer_id']);
        });
    }
};
