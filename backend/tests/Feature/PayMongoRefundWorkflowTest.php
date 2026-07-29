<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\SalesOrder;
use App\Models\SalesRefund;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PayMongoRefundWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_paymongo_refund_is_sent_and_posted_once(): void
    {
        [$user, $invoice, $refund] = $this->approvedRefundFixture();
        config(['services.paymongo.secret_key' => 'sk_live_refund_test']);
        Http::fake([
            'api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 'ref_success_001',
                    'attributes' => [
                        'status' => 'succeeded',
                        'amount' => 50000,
                        'payment_id' => 'pay_original_001',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/sales/refunds/{$refund->id}/process")
            ->assertOk()
            ->assertJsonPath('data.status', 'processed')
            ->assertJsonPath('data.provider_refund_id', 'ref_success_001');

        Http::assertSent(fn ($request) => $request->url() === 'https://api.paymongo.com/v1/refunds'
            && $request['data']['attributes']['amount'] === 50000
            && $request['data']['attributes']['payment_id'] === 'pay_original_001');
        $this->assertSame(500.0, (float) $invoice->fresh()->refunded_amount);
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => SalesRefund::class,
            'reference_id' => $refund->id,
        ]);
    }

    public function test_pending_paymongo_refund_posts_only_after_signed_success_webhook(): void
    {
        [$user, $invoice, $refund] = $this->approvedRefundFixture();
        config([
            'services.paymongo.secret_key' => 'sk_live_refund_test',
            'services.paymongo.webhook_secret' => 'refund-webhook-secret',
        ]);
        Http::fake([
            'api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 'ref_pending_001',
                    'attributes' => [
                        'status' => 'pending',
                        'amount' => 50000,
                        'payment_id' => 'pay_original_001',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/sales/refunds/{$refund->id}/process")
            ->assertOk()
            ->assertJsonPath('data.status', 'processing');

        $this->assertSame(0.0, (float) $invoice->fresh()->refunded_amount);
        $this->assertDatabaseMissing('journal_entries', [
            'reference_type' => SalesRefund::class,
            'reference_id' => $refund->id,
        ]);

        $payload = [
            'data' => [
                'id' => 'evt_refund_success_001',
                'attributes' => [
                    'type' => 'payment.refund.updated',
                    'data' => [
                        'id' => 'ref_pending_001',
                        'type' => 'refund',
                        'attributes' => [
                            'status' => 'succeeded',
                            'amount' => 50000,
                            'payment_id' => 'pay_original_001',
                        ],
                    ],
                ],
            ],
        ];

        [$raw, $headers] = $this->signedWebhook($payload, 'refund-webhook-secret');
        $this->call('POST', '/api/v1/billing/webhook', [], [], [], $headers, $raw)->assertOk();
        $this->assertSame('processed', $refund->fresh()->status);
        $this->assertSame(500.0, (float) $invoice->fresh()->refunded_amount);
        $this->assertDatabaseHas('integration_events', [
            'external_id' => 'evt_refund_success_001',
            'status' => 'processed',
        ]);

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], $headers, $raw)->assertOk();
        $this->assertSame(1, JournalEntry::where([
            'reference_type' => SalesRefund::class,
            'reference_id' => $refund->id,
        ])->count());
        $this->assertSame(500.0, (float) $invoice->fresh()->refunded_amount);
    }

    public function test_missing_paymongo_key_never_simulates_a_successful_refund(): void
    {
        [$user, $invoice, $refund] = $this->approvedRefundFixture();
        config(['services.paymongo.secret_key' => null]);

        $this->actingAs($user)
            ->postJson("/api/v1/sales/refunds/{$refund->id}/process")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('refund');

        $this->assertSame('provider_failed', $refund->fresh()->status);
        $this->assertSame(0.0, (float) $invoice->fresh()->refunded_amount);
        $this->assertDatabaseMissing('journal_entries', [
            'reference_type' => SalesRefund::class,
            'reference_id' => $refund->id,
        ]);
    }

    private function approvedRefundFixture(): array
    {
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-REFUND-'.uniqid(),
            'customer_name' => 'PayMongo Customer',
            'subtotal' => 500,
            'tax_amount' => 0,
            'total_amount' => 500,
            'amount_received' => 500,
            'balance' => 0,
            'credited_amount' => 500,
            'refunded_amount' => 0,
            'status' => 'cancelled',
            'payment_method' => 'GCash',
            'payment_type' => 'full',
            'created_by' => $user->id,
        ]);
        $collection = Collection::create([
            'client_name' => 'PayMongo Customer',
            'date' => now()->toDateString(),
            'travel_date' => now()->addMonth()->toDateString(),
            'rate' => 500,
            'billing_amount' => 500,
            'paid_amount' => 500,
            'remaining_balance' => 0,
            'collection_status' => 'completed',
            'invoice_id' => $invoice->id,
        ]);
        $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'GCash',
            'amount' => 500,
            'balance' => 0,
            'idempotency_key' => 'paymongo-fixture-'.uniqid(),
            'paymongo_payment_id' => 'pay_original_001',
        ]);
        $order = SalesOrder::create([
            'order_number' => 'SO-REFUND-'.uniqid(),
            'invoice_id' => $invoice->id,
            'agent_id' => $user->id,
            'status' => 'cancelled',
            'subtotal' => 500,
            'total_amount' => 500,
            'amount_paid' => 500,
            'balance' => 0,
        ]);
        $credit = CreditNote::create([
            'credit_note_number' => 'CN-REFUND-'.uniqid(),
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'status' => 'posted',
            'subtotal' => 500,
            'tax_amount' => 0,
            'total_amount' => 500,
            'reason' => 'Approved cancellation',
            'issued_by' => $user->id,
            'issued_at' => now(),
            'posted_at' => now(),
        ]);
        $refund = SalesRefund::create([
            'refund_number' => 'REF-TEST-'.uniqid(),
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'credit_note_id' => $credit->id,
            'status' => 'approved',
            'amount' => 500,
            'refund_method' => 'PayMongo',
            'reason' => 'Customer cancellation',
            'requested_by' => $user->id,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return [$user, $invoice, $refund];
    }

    private function signedWebhook(array $payload, string $secret): array
    {
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, $secret);

        return [$raw, [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature}",
        ]];
    }
}
