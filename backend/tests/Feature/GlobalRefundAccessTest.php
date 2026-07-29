<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\User;
use App\Services\SalesLifecycleService;
use Database\Seeders\RefundExampleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GlobalRefundAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_billing_invoice_response_contains_the_complete_refund_workflow(): void
    {
        $user = User::factory()->superAdmin()->create();
        $this->seed(RefundExampleSeeder::class);
        $invoice = Invoice::where('invoice_number', RefundExampleSeeder::INVOICE_NUMBER)->firstOrFail();

        $this->actingAs($user)
            ->getJson("/api/v1/billing/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.refunded_amount', 0)
            ->assertJsonPath('data.collection.payments.0.payment_method', 'Cash')
            ->assertJsonPath('data.sales_order.adjustments.0.type', 'cancellation')
            ->assertJsonPath('data.sales_order.credit_notes.0.status', 'posted');

        $this->actingAs($user)
            ->getJson('/api/v1/billing?search='.RefundExampleSeeder::INVOICE_NUMBER)
            ->assertOk()
            ->assertJsonPath('data.0.sales_order.credit_notes.0.status', 'posted');
    }

    public function test_billing_can_start_cancellation_without_a_collection_record(): void
    {
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-GLOBAL-REFUND-001',
            'customer_name' => 'Billing Refund Customer',
            'subtotal' => 5000,
            'tax_amount' => 0,
            'total_amount' => 5000,
            'amount_received' => 5000,
            'balance' => 0,
            'status' => 'paid',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/sales/invoices/{$invoice->id}/cancellation", [
                'reason' => 'Customer requested cancellation from Billing.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'cancellation');

        $this->assertDatabaseHas('sales_orders', [
            'invoice_id' => $invoice->id,
            'status' => 'confirmed',
        ]);
        $this->assertDatabaseHas('sales_order_adjustments', [
            'invoice_id' => $invoice->id,
            'status' => 'pending_approval',
        ]);
    }

    public function test_partial_payment_refund_is_capped_by_money_actually_collected(): void
    {
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PARTIAL-REFUND-001',
            'customer_name' => 'Partial Payment Customer',
            'subtotal' => 10000,
            'tax_amount' => 0,
            'total_amount' => 10000,
            'amount_received' => 3000,
            'balance' => 0,
            'credited_amount' => 10000,
            'refunded_amount' => 0,
            'status' => 'cancelled',
            'payment_method' => 'Cash',
            'payment_type' => 'downpayment',
            'created_by' => $user->id,
        ]);
        $collection = Collection::create([
            'client_name' => 'Partial Payment Customer',
            'date' => now()->toDateString(),
            'travel_date' => now()->addMonth()->toDateString(),
            'rate' => 10000,
            'billing_amount' => 10000,
            'paid_amount' => 3000,
            'remaining_balance' => 7000,
            'collection_status' => 'partial',
            'invoice_id' => $invoice->id,
        ]);
        $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 3000,
            'balance' => 7000,
        ]);
        $order = SalesOrder::create([
            'order_number' => 'SO-PARTIAL-REFUND-001',
            'invoice_id' => $invoice->id,
            'agent_id' => $user->id,
            'status' => 'cancelled',
            'subtotal' => 10000,
            'total_amount' => 10000,
            'amount_paid' => 3000,
            'balance' => 0,
        ]);
        $credit = CreditNote::create([
            'credit_note_number' => 'CN-PARTIAL-REFUND-001',
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'status' => 'posted',
            'subtotal' => 10000,
            'tax_amount' => 0,
            'total_amount' => 10000,
            'reason' => 'Cancelled partial-payment booking',
            'issued_by' => $user->id,
            'issued_at' => now(),
            'posted_at' => now(),
        ]);

        try {
            app(SalesLifecycleService::class)->requestRefund(
                $credit,
                3000.01,
                'Cash',
                'Exceeds collected payment',
                $user->id
            );
            $this->fail('Refund should not exceed the amount actually collected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount', $exception->errors());
        }

        $refund = app(SalesLifecycleService::class)->requestRefund(
            $credit,
            3000,
            'Cash',
            'Return collected deposit',
            $user->id
        );

        $this->assertSame(3000.0, (float) $refund->amount);
    }
}
