<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\OpeningBalanceBatch;
use App\Models\ReconciliationRun;
use App\Services\AccountingReadinessService;
use Illuminate\Http\Request;

class FinancialReadinessController extends Controller
{
    public function runs(){return response()->json(['success'=>true,'data'=>ReconciliationRun::with('exceptions')->latest()->paginate(20)]);}
    public function run(Request $request,AccountingReadinessService $service){$data=$request->validate(['as_of_date'=>'required|date|before_or_equal:today']);return response()->json(['success'=>true,'data'=>$service->reconcile($data['as_of_date'],$request->user()->id)],201);}
    public function batches(){return response()->json(['success'=>true,'data'=>OpeningBalanceBatch::with('lines.account')->latest()->paginate(20)]);}
    public function createBatch(Request $request,AccountingReadinessService $service){$data=$request->validate(['as_of_date'=>'required|date','notes'=>'required|string|max:3000','lines'=>'required|array|min:2','lines.*.account_id'=>'required|integer|exists:accounts,id','lines.*.debit'=>'required|numeric|min:0','lines.*.credit'=>'required|numeric|min:0','lines.*.description'=>'required|string|max:255']);return response()->json(['success'=>true,'data'=>$service->createOpeningBatch($data,$request->user()->id)],201);}
    public function approveBatch(Request $request,OpeningBalanceBatch $batch,AccountingReadinessService $service){return response()->json(['success'=>true,'data'=>$service->approveOpeningBatch($batch,$request->user()->id)]);}
    public function postBatch(Request $request,OpeningBalanceBatch $batch,AccountingReadinessService $service){return response()->json(['success'=>true,'data'=>$service->postOpeningBatch($batch,$request->user()->id)]);}
}
