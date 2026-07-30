<?php

namespace Tests\Feature;

use App\Models\CollectionPayment;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayMongoWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_gateway_payment_creates_one_collection_payment_and_is_idempotent(): void
    {
        config(['services.paymongo.webhook_secret' => 'test-webhook-secret']);
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PAYMONGO-001', 'customer_name' => 'Gateway Customer',
            'subtotal' => 1000, 'tax_amount' => 120, 'total_amount' => 1120,
            'amount_received' => 0, 'balance' => 1120, 'status' => 'pending_payment',
            'payment_method' => 'GCash', 'payment_type' => 'full', 'payment_id' => 'cs_test_001',
            'created_by' => $user->id,
        ]);

        $payload = [
            'data' => [
                'id' => 'evt_test_001',
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => ['id' => 'pay_test_001', 'type' => 'payment', 'attributes' => ['checkout_session_id' => 'cs_test_001', 'amount' => 112000]],
                ],
            ],
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'test-webhook-secret');
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature}"];

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], $headers, $raw)->assertOk();
        $this->assertDatabaseHas('collection_payments', [
            'idempotency_key' => 'paymongo:evt_test_001',
            'paymongo_payment_id' => 'pay_test_001',
            'amount' => 1120,
        ]);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame(0.0, (float) $invoice->fresh()->balance);

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], $headers, $raw)->assertOk();
        $this->assertSame(1, CollectionPayment::where('idempotency_key', 'paymongo:evt_test_001')->count());
    }

    public function test_paymongo_webhook_alias_accepts_the_dashboard_path(): void
    {
        config(['services.paymongo.webhook_secret' => 'test-webhook-secret']);
        $raw = json_encode([
            'data' => [
                'id' => 'evt_alias_path_001',
                'attributes' => ['type' => 'unknown'],
            ],
        ], JSON_THROW_ON_ERROR);
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'test-webhook-secret');

        $this->call('POST', '/api/v1/paymongo/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature}",
        ], $raw)->assertOk();
    }
}
