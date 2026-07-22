<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->unsignedBigInteger('service_id')->nullable()->change();
            $table->string('item_name')->nullable()->after('service_id');
            $table->string('service_type')->nullable()->index()->after('item_name');
            $table->text('item_description')->nullable()->after('service_type');
            $table->json('item_metadata')->nullable()->after('item_description');
        });

        DB::table('invoice_items')
            ->whereNotNull('service_id')
            ->orderBy('id')
            ->chunkById(200, function ($items): void {
                $services = DB::table('services')
                    ->whereIn('id', $items->pluck('service_id')->filter()->unique())
                    ->get(['id', 'name', 'service_type', 'description'])
                    ->keyBy('id');

                foreach ($items as $item) {
                    $service = $services->get($item->service_id);
                    if ($service) {
                        DB::table('invoice_items')->where('id', $item->id)->update([
                            'item_name' => $service->name,
                            'service_type' => $service->service_type,
                            'item_description' => $service->description,
                        ]);
                    }
                }
            });

        Schema::table('custom_transaction_details', function (Blueprint $table) {
            $table->foreignId('passport_case_id')
                ->nullable()
                ->after('invoice_id')
                ->constrained('passport_cases')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('custom_transaction_details', function (Blueprint $table) {
            $table->dropConstrainedForeignId('passport_case_id');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['item_name', 'service_type', 'item_description', 'item_metadata']);
            $table->unsignedBigInteger('service_id')->nullable(false)->change();
        });
    }
};
