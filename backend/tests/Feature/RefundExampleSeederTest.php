<?php

namespace Tests\Feature;

use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\SalesRefund;
use App\Models\User;
use App\Services\SalesLifecycleService;
use Database\Seeders\RefundExampleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefundExampleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_refund_example_is_idempotent_and_can_complete_the_cash_refund_flow(): void
    {
        $actor = User::factory()->superAdmin()->create();

        $this->seed(RefundExampleSeeder::class);
        $this->seed(RefundExampleSeeder::class);

        $invoice = Invoice::where('invoice_number', RefundExampleSeeder::INVOICE_NUMBER)->firstOrFail();
        $creditNote = CreditNote::where('invoice_id', $invoice->id)->firstOrFail();

        $this->assertSame(1, Invoice::where('invoice_number', RefundExampleSeeder::INVOICE_NUMBER)->count());
        $this->assertSame('completed', $invoice->collection->collection_status);
        $this->assertSame(10000.0, (float) $creditNote->total_amount);
        $this->assertSame(1, JournalEntry::where([
            'reference_type' => CreditNote::class,
            'reference_id' => $creditNote->id,
        ])->count());

        $service = app(SalesLifecycleService::class);
        $refund = $service->requestRefund(
            $creditNote,
            10000,
            'Cash',
            'Demo customer refund',
            $actor->id
        );
        $service->approveRefund($refund, $actor->id);
        $processed = $service->processRefund($refund, 'DEMO-CASH-VOUCHER-001', $actor->id);

        $this->assertSame('processed', $processed->status);
        $this->assertSame(10000.0, (float) $invoice->fresh()->refunded_amount);
        $this->assertSame(1, JournalEntry::where([
            'reference_type' => SalesRefund::class,
            'reference_id' => $refund->id,
        ])->count());
    }
}
