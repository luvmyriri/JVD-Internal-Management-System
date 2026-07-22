<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up():void
    {
        $insert=function(string $type,int $id,?int $bus,?int $driver,$start,$end,?string $reference,string $status){
            if(!$bus&&!$driver)return;
            DB::table('resource_allocations')->updateOrInsert(['source_type'=>$type,'source_id'=>$id,'bus_id'=>$bus],['driver_id'=>$driver,'starts_at'=>$start,'ends_at'=>$end,'reference'=>$reference,'status'=>$status,'created_at'=>now(),'updated_at'=>now()]);
        };
        foreach(DB::table('bookings as b')->join('invoices as i','i.id','=','b.invoice_id')->where('i.status','!=','cancelled')->whereNotNull('b.travel_date')->select('b.*','i.invoice_number','i.status as invoice_status')->get() as $row){
            $start=\Carbon\Carbon::parse($row->departure_datetime??$row->travel_date)->startOfDay();$arrival=$row->arrival_datetime??null;$end=$arrival?\Carbon\Carbon::parse($arrival):$start->copy()->addDay();
            $insert(\App\Models\Booking::class,$row->id,$row->bus_id,$row->driver_id,$start,$end,$row->invoice_number,$row->invoice_status);
        }
        foreach(DB::table('travels')->where('status','!=','cancelled')->get() as $row){
            $departure=$row->departure_datetime??null;$arrival=$row->arrival_datetime??null;$start=\Carbon\Carbon::parse($departure??$row->travel_date)->startOfDay();$end=$arrival?\Carbon\Carbon::parse($arrival):$start->copy()->addDay();
            $insert(\App\Models\Travel::class,$row->id,$row->bus_id,$row->driver_id,$start,$end,$row->reference_type.'-'.$row->reference_id,$row->status);
        }
        foreach(DB::table('pms_schedules')->where('status','!=','cancelled')->whereNull('work_order_id')->get() as $row){
            $start=\Carbon\Carbon::parse($row->maintenance_date)->startOfDay();$insert(\App\Models\PmsSchedule::class,$row->id,$row->bus_id,$row->driver_id??null,$start,$start->copy()->addDay(),'PMS-'.$row->id,$row->status);
        }
    }
    public function down():void
    {
        DB::table('resource_allocations')->whereIn('source_type',[\App\Models\Booking::class,\App\Models\Travel::class,\App\Models\PmsSchedule::class])->delete();
    }
};
