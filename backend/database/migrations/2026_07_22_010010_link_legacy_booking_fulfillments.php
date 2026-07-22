<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up():void
    {
        $rows=DB::table('sales_order_items as item')->join('sales_orders as orders','orders.id','=','item.sales_order_id')
            ->join('bookings','bookings.invoice_id','=','orders.invoice_id')->whereNull('item.fulfillment_id')
            ->select('item.id','bookings.id as booking_id')->get();
        foreach($rows as $row)DB::table('sales_order_items')->where('id',$row->id)->update(['fulfillment_type'=>\App\Models\Booking::class,'fulfillment_id'=>$row->booking_id]);
    }
    public function down():void{DB::table('sales_order_items')->where('fulfillment_type',\App\Models\Booking::class)->update(['fulfillment_type'=>null,'fulfillment_id'=>null]);}
};
