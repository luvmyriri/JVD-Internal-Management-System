<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HealthController extends Controller
{
    public function readiness()
    {
        $checks=['database'=>false,'schema'=>false,'storage'=>false];
        try{DB::select('SELECT 1');$checks['database']=true;}catch(\Throwable){}
        try{$checks['schema']=Schema::hasTable('sales_orders')&&Schema::hasTable('resource_allocations')&&Schema::hasTable('journal_entries');}catch(\Throwable){}
        $checks['storage']=is_writable(storage_path('framework'))&&is_writable(storage_path('logs'));
        $ready=!in_array(false,$checks,true);
        return response()->json(['status'=>$ready?'ready':'not_ready','checks'=>$checks,'timestamp'=>now()->toIso8601String()],$ready?200:503);
    }
}
