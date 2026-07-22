<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->boolean('is_sales_catalog')->default(true)->index()->after('is_active');
        });

        // Accounting expense labels were historically stored beside sellable products.
        DB::table('services')
            ->whereRaw('LOWER(category) = ?', ['cash budget'])
            ->update(['is_sales_catalog' => false]);

        // The former Custom Transactions page created a new catalog Service for every
        // transaction. Those rows remain referenced for audit history but must not be
        // offered as reusable fixed packages.
        $customServiceIds = DB::table('invoice_items')
            ->join('custom_transaction_details', 'custom_transaction_details.invoice_id', '=', 'invoice_items.invoice_id')
            ->whereNotNull('invoice_items.service_id')
            ->distinct()
            ->pluck('invoice_items.service_id');

        $normalServiceIds = DB::table('invoice_items')
            ->leftJoin('custom_transaction_details', 'custom_transaction_details.invoice_id', '=', 'invoice_items.invoice_id')
            ->whereNull('custom_transaction_details.id')
            ->whereNotNull('invoice_items.service_id')
            ->distinct()
            ->pluck('invoice_items.service_id');

        $transactionOnlyServiceIds = $customServiceIds->diff($normalServiceIds);

        if ($transactionOnlyServiceIds->isNotEmpty()) {
            DB::table('services')
                ->whereIn('id', $transactionOnlyServiceIds)
                ->where(function ($query): void {
                    $query->whereRaw('LOWER(description) LIKE ?', ['custom % arrangement%'])
                        ->orWhereRaw('LOWER(description) LIKE ?', ['%booking reservation specifications%']);
                })
                ->update(['is_sales_catalog' => false]);
        }

        // Complete the type classification for genuine legacy catalog products.
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['joiners'])->update(['service_type' => 'joiner_tour']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['accommodation'])->update(['service_type' => 'accommodation_booking']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['documentation'])->whereRaw('LOWER(name) LIKE ?', ['%passport%'])->update(['service_type' => 'passport_assistance']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['documentation'])->whereRaw('LOWER(name) LIKE ?', ['%visa%'])->update(['service_type' => 'visa_assistance']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['transport'])->whereRaw('LOWER(name) LIKE ?', ['%transfer%'])->update(['service_type' => 'transfer_service']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['transport'])->update(['service_type' => 'bus_rental']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['package'])->whereRaw('LOWER(name) LIKE ?', ['%educational%'])->update(['service_type' => 'educational_tour']);
        DB::table('services')->whereNull('service_type')->whereRaw('LOWER(category) = ?', ['package'])->update(['service_type' => 'private_tour']);
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('is_sales_catalog');
        });
    }
};
