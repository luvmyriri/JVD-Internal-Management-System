<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_tour_programs', function (Blueprint $table) {
            // Educational programs are their own sellable definition. The legacy
            // service link remains nullable only for historical records.
            $table->unsignedBigInteger('service_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        $now = now();

        DB::table('educational_tour_programs')
            ->whereNull('service_id')
            ->orderBy('id')
            ->get()
            ->each(function ($program) use ($now): void {
                $serviceId = DB::table('services')->insertGetId([
                    'name' => $program->name,
                    'description' => 'Educational program catalog link restored during rollback.',
                    'category' => 'Educational Tour',
                    'service_type' => 'educational_tour',
                    'price' => $program->student_price,
                    'is_active' => $program->is_active,
                    'is_sales_catalog' => false,
                    'created_by' => $program->created_by,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('educational_tour_programs')
                    ->where('id', $program->id)
                    ->update(['service_id' => $serviceId]);
            });

        Schema::table('educational_tour_programs', function (Blueprint $table) {
            $table->unsignedBigInteger('service_id')->nullable(false)->change();
        });
    }
};
