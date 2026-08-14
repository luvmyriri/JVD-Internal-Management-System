<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Invoice;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PayMongoWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_gateway_payment_creates_one_collection_payment_and_is_idempotent(): void
    {
        Notification::fake();
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

        // PayMongo can deliver the same provider payment under a different event
        // id. Provider payment identity is also accounting idempotency evidence.
        $alternatePayload = $payload;
        $alternatePayload['data']['id'] = 'evt_test_002';
        $alternateRaw = json_encode($alternatePayload, JSON_THROW_ON_ERROR);
        $alternateSignature = hash_hmac('sha256', $timestamp.'.'.$alternateRaw, 'test-webhook-secret');
        $alternateHeaders = ['CONTENT_TYPE' => 'application/json', 'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$alternateSignature}"];

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], $alternateHeaders, $alternateRaw)->assertOk();
        $this->assertSame(1, CollectionPayment::where('paymongo_payment_id', 'pay_test_001')->count());
        $this->assertDatabaseMissing('collection_payments', ['idempotency_key' => 'paymongo:evt_test_002']);
        Notification::assertSentToTimes($user, SystemAlert::class, 1);
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

    public function test_gateway_overpayment_is_rejected_without_posting_a_collection_payment(): void
    {
        config(['services.paymongo.webhook_secret' => 'test-webhook-secret']);
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PAYMONGO-OVERPAY', 'customer_name' => 'Gateway Customer',
            'subtotal' => 1, 'tax_amount' => 0, 'total_amount' => 1,
            'amount_received' => 0, 'balance' => 1, 'status' => 'pending_payment',
            'payment_method' => 'QR Ph', 'payment_type' => 'full', 'payment_id' => 'cs_test_overpay',
            'created_by' => $user->id,
        ]);
        $payload = ['data' => ['id' => 'evt_test_overpay', 'attributes' => [
            'type' => 'checkout_session.payment.paid',
            'data' => ['id' => 'pay_test_overpay', 'type' => 'payment', 'attributes' => [
                'checkout_session_id' => 'cs_test_overpay', 'amount' => 200, 'currency' => 'PHP',
            ]],
        ]]];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'test-webhook-secret');

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature}",
        ], $raw)->assertConflict();

        $this->assertSame(0.0, (float) $invoice->fresh()->amount_received);
        $this->assertDatabaseMissing('collection_payments', ['paymongo_payment_id' => 'pay_test_overpay']);
    }

    public function test_gateway_rechecks_locked_payment_evidence_instead_of_stale_invoice_balance(): void
    {
        config(['services.paymongo.webhook_secret' => 'test-webhook-secret']);
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PAYMONGO-STALE', 'customer_name' => 'Gateway Customer',
            'subtotal' => 1000, 'tax_amount' => 0, 'total_amount' => 1000,
            'amount_received' => 0, 'balance' => 1000, 'status' => 'pending_payment',
            'payment_method' => 'GCash', 'payment_type' => 'partial', 'payment_id' => 'cs_test_stale',
            'created_by' => $user->id,
        ]);
        $collection = Collection::create([
            'invoice_id' => $invoice->id,
            'client_name' => 'Gateway Customer',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 1000,
            'billing_amount' => 1000,
            'remaining_balance' => 1000,
            'paid_amount' => 0,
            'collection_status' => 'pending',
        ]);
        $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 900,
            'balance' => 100,
            'idempotency_key' => 'existing-counter-payment',
        ]);

        $payload = ['data' => ['id' => 'evt_test_stale', 'attributes' => [
            'type' => 'checkout_session.payment.paid',
            'data' => ['id' => 'pay_test_stale', 'type' => 'payment', 'attributes' => [
                'checkout_session_id' => 'cs_test_stale', 'amount' => 20000, 'currency' => 'PHP',
            ]],
        ]]];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'test-webhook-secret');

        $this->call('POST', '/api/v1/billing/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature}",
        ], $raw)->assertConflict();

        $this->assertSame(1, $collection->payments()->count());
        $this->assertDatabaseMissing('collection_payments', ['paymongo_payment_id' => 'pay_test_stale']);
        $this->assertLessThanOrEqual(1000.0, (float) $invoice->fresh()->amount_received);
    }
}
