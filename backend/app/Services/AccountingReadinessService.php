<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\OpeningBalanceBatch;
use App\Models\ReconciliationException;
use App\Models\ReconciliationRun;
use App\Models\ResourceAllocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountingReadinessService
{
    public function reconcile(string $asOfDate, int $actorId): ReconciliationRun
    {
        $run = ReconciliationRun::create(['run_number'=>$this->number('REC'),'as_of_date'=>$asOfDate,'status'=>'running','run_by'=>$actorId]);
        $checked = 0;
        foreach (Invoice::with(['salesOrder','collection.payments'])->whereDate('created_at','<=',$asOfDate)->get() as $invoice) {
            $checked++;
            if (!$invoice->salesOrder) $this->exception($run,'missing_sales_order',$invoice,'Invoice is not linked to the shared sales order ledger.');
            elseif (abs((float)$invoice->total_amount-(float)$invoice->salesOrder->total_amount)>.01) $this->exception($run,'order_invoice_total',$invoice,'Sales order and invoice totals differ.',$invoice->total_amount,$invoice->salesOrder->total_amount);
            if ($invoice->collection) {
                $paid=(float)$invoice->collection->payments->sum('amount'); $expected=max(0,(float)$invoice->total_amount-$paid-(float)$invoice->credited_amount);
                if(abs($expected-(float)$invoice->balance)>.01)$this->exception($run,'collection_balance',$invoice,'Invoice balance does not reconcile to posted collections and credits.',$expected,$invoice->balance);
            }
            if ($invoice->finalized_at && !JournalEntry::where('reference_type',Invoice::class)->where('reference_id',$invoice->id)->exists()) $this->exception($run,'missing_invoice_journal',$invoice,'Finalized invoice has no accrual journal entry.');
        }
        foreach (JournalEntry::with('ledgerLines')->whereDate('date','<=',$asOfDate)->get() as $journal) {
            $checked++; $debits=(float)$journal->ledgerLines->sum('debit'); $credits=(float)$journal->ledgerLines->sum('credit');
            if(abs($debits-$credits)>.01)$this->exception($run,'unbalanced_journal',$journal,'Journal entry is not balanced.',$debits,$credits,'critical');
        }
        foreach (ResourceAllocation::with('source')->whereNotIn('status',['cancelled','completed'])->get() as $allocation) {
            $checked++; if(!$allocation->source)$this->exception($run,'orphan_allocation',$allocation,'Active resource allocation has no source record.');
        }
        $counts=$run->exceptions()->selectRaw('category, COUNT(*) count')->groupBy('category')->pluck('count','category');
        $run->update(['status'=>$run->exceptions()->exists()?'exceptions_found':'clean','checked_records'=>$checked,'exception_count'=>$run->exceptions()->count(),'summary'=>$counts,'completed_at'=>now()]);
        return $run->fresh('exceptions.reference');
    }

    public function createOpeningBatch(array $data, int $actorId): OpeningBalanceBatch
    {
        return DB::transaction(function()use($data,$actorId){
            $debits=round(collect($data['lines'])->sum('debit'),2);$credits=round(collect($data['lines'])->sum('credit'),2);
            if(abs($debits-$credits)>.01)throw ValidationException::withMessages(['lines'=>'Opening balances must have equal debits and credits.']);
            $batch=OpeningBalanceBatch::create(['batch_number'=>$this->number('OB'),'as_of_date'=>$data['as_of_date'],'status'=>'pending_approval','notes'=>$data['notes'],'total_debits'=>$debits,'total_credits'=>$credits,'created_by'=>$actorId]);
            foreach($data['lines'] as $line)$batch->lines()->create($line);
            return $batch->load('lines.account');
        });
    }

    public function approveOpeningBatch(OpeningBalanceBatch $batch,int $actorId):OpeningBalanceBatch
    {
        if($batch->status!=='pending_approval')throw ValidationException::withMessages(['batch'=>'Only pending opening balances can be approved.']);
        if($batch->created_by===$actorId)throw ValidationException::withMessages(['batch'=>'Opening balances require maker-checker approval by a different user.']);
        $batch->update(['status'=>'approved','approved_by'=>$actorId,'approved_at'=>now()]);return $batch;
    }

    public function postOpeningBatch(OpeningBalanceBatch $batch,int $actorId):OpeningBalanceBatch
    {
        return DB::transaction(function()use($batch,$actorId){
            $batch=OpeningBalanceBatch::lockForUpdate()->with('lines')->findOrFail($batch->id);
            if($batch->status!=='approved')throw ValidationException::withMessages(['batch'=>'Opening balances require approval before posting.']);
            app(LedgerService::class)->recordEntry($batch->as_of_date->toDateString(),"Approved opening balances {$batch->batch_number}",$batch->lines->map(fn($line)=>['account_id'=>$line->account_id,'debit'=>$line->debit,'credit'=>$line->credit,'description'=>$line->description])->all(),$batch);
            $batch->update(['status'=>'posted','posted_by'=>$actorId,'posted_at'=>now()]);return $batch->fresh('lines.account');
        });
    }

    private function exception(ReconciliationRun $run,string $category,$reference,string $message,$expected=null,$actual=null,string $severity='error'):void
    { ReconciliationException::create(['reconciliation_run_id'=>$run->id,'category'=>$category,'severity'=>$severity,'reference_type'=>$reference->getMorphClass(),'reference_id'=>$reference->getKey(),'message'=>$message,'expected_amount'=>$expected,'actual_amount'=>$actual]); }
    private function number(string $prefix):string{return $prefix.'-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));}
}
