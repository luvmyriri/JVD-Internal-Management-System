<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Invoice;
use App\Models\User;
use App\Services\AccountingReadinessService;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AccountingReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_reconciliation_persists_actionable_exceptions():void
    {
        $user=User::factory()->superAdmin()->create();
        $invoice=Invoice::create(['invoice_number'=>'INV-LEGACY-GAP','customer_name'=>'Legacy','subtotal'=>1000,'tax_amount'=>120,'total_amount'=>1120,'balance'=>1120,'amount_received'=>0,'status'=>'pending_payment','payment_method'=>'Cash','payment_type'=>'full','created_by'=>$user->id,'finalized_at'=>now()]);
        $run=app(AccountingReadinessService::class)->reconcile(now()->toDateString(),$user->id);
        $this->assertSame('exceptions_found',$run->status);
        $this->assertTrue($run->exceptions->contains('category','missing_sales_order'));
        $this->assertTrue($run->exceptions->contains('category','missing_invoice_journal'));
    }

    public function test_opening_balances_require_maker_checker_then_post_balanced_journal():void
    {
        $maker=User::factory()->superAdmin()->create();$checker=User::factory()->superAdmin()->create();
        app(LedgerService::class)->seedDefaultAccounts();
        $cash=Account::where('code','1000')->firstOrFail();$equity=Account::where('code','3000')->firstOrFail();
        $service=app(AccountingReadinessService::class);
        $batch=$service->createOpeningBatch(['as_of_date'=>now()->subDay()->toDateString(),'notes'=>'Management-approved legacy balances','lines'=>[
            ['account_id'=>$cash->id,'debit'=>50000,'credit'=>0,'description'=>'Opening bank balance'],
            ['account_id'=>$equity->id,'debit'=>0,'credit'=>50000,'description'=>'Opening equity'],
        ]],$maker->id);
        try{$service->approveOpeningBatch($batch,$maker->id);$this->fail('Maker approved own batch.');}catch(ValidationException){$this->assertTrue(true);}
        $service->approveOpeningBatch($batch->fresh(),$checker->id);
        $posted=$service->postOpeningBatch($batch->fresh(),$checker->id);
        $this->assertSame('posted',$posted->status);
        $this->assertDatabaseHas('journal_entries',['reference_type'=>get_class($batch),'reference_id'=>$batch->id]);
    }
}
