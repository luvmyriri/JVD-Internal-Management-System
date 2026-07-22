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
            $table->decimal('adult_price', 15, 2)->nullable()->after('children');
            $table->decimal('child_price', 15, 2)->nullable()->after('adult_price');
        });

        // Historical passenger lines did not retain their quoted adult/child rates.
        // Prefer the linked service rates when they still reconcile to the sold total;
        // otherwise use the weighted sold unit price so reprints remain arithmetically exact.
        DB::table('invoice_items')
            ->where(function ($query): void {
                $query->whereNotNull('adults')->orWhereNotNull('children');
            })
            ->orderBy('id')
            ->chunkById(200, function ($items): void {
                $services = DB::table('services')
                    ->whereIn('id', $items->pluck('service_id')->filter()->unique())
                    ->get(['id', 'adult_price', 'child_price'])
                    ->keyBy('id');

                foreach ($items as $item) {
                    $adultCount = max(0, (int) ($item->adults ?? 0));
                    $childCount = max(0, (int) ($item->children ?? 0));
                    $travelerCount = $adultCount + $childCount;

                    if ($travelerCount === 0) {
                        continue;
                    }

                    $service = $services->get($item->service_id);
                    $adultRate = $adultCount > 0
                        ? (float) ($service?->adult_price ?? $item->unit_price)
                        : null;
                    $childRate = $childCount > 0
                        ? (float) ($service?->child_price ?? $item->unit_price)
                        : null;

                    $candidateTotal = ($adultCount * ($adultRate ?? 0))
                        + ($childCount * ($childRate ?? 0));

                    if (abs($candidateTotal - (float) $item->total_price) > 0.01) {
                        $weightedRate = round((float) $item->total_price / $travelerCount, 2);
                        $adultRate = $adultCount > 0 ? $weightedRate : null;
                        $childRate = $childCount > 0 ? $weightedRate : null;
                    }

                    DB::table('invoice_items')->where('id', $item->id)->update([
                        'adult_price' => $adultRate,
                        'child_price' => $childRate,
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['adult_price', 'child_price']);
        });
    }
};
