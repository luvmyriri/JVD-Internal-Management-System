<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_unavailabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('type')->default('leave');
            $table->string('status')->default('approved')->index();
            $table->text('reason');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->index(['driver_id','starts_at','ends_at'],'driver_unavailability_window');
        });

        $rows = DB::table('work_orders as wo')
            ->leftJoin('pms_schedules as pms','pms.work_order_id','=','wo.id')
            ->where('wo.type','maintenance')->whereNotIn('wo.status',['cancelled','completed'])->whereNotNull('wo.bus_id')
            ->select('wo.id','wo.bus_id','wo.wo_number','wo.status','wo.created_at','pms.maintenance_date')->get();
        foreach ($rows as $row) {
            $start = \Carbon\Carbon::parse($row->maintenance_date ?? $row->created_at ?? now())->startOfDay();
            DB::table('resource_allocations')->updateOrInsert(
                ['source_type'=>\App\Models\WorkOrder::class,'source_id'=>$row->id,'bus_id'=>$row->bus_id],
                ['driver_id'=>null,'starts_at'=>$start,'ends_at'=>$start->copy()->addDay(),'status'=>$row->status,
                    'reference'=>$row->wo_number,'created_at'=>now(),'updated_at'=>now()]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_unavailabilities');
    }
};
