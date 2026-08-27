<?php

namespace Tests\Feature;

use App\Mail\TransactionNotificationMail;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use App\Models\User;
use App\Services\InvoiceDocumentMailService;
use App\Services\RouteEstimateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_has_payments_relation_and_send_email_succeeds(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $customer = Customer::factory()->create(['email' => 'client@example.com']);
        $service = Service::create([
            'name' => 'Tour Service',
            'category' => 'Package',
            'price' => 1500,
        ]);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-001',
            'customer_id' => $customer->id,
            'customer_name' => 'John Doe',
            'customer_email' => 'client@example.com',
            'subtotal' => 1500,
            'tax_amount' => 180,
            'total_amount' => 1680,
            'amount_received' => 1680,
            'balance' => 0,
            'payment_method' => 'Cash',
            'status' => 'paid',
            'created_by' => $admin->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'item_name' => $service->name,
            'quantity' => 1,
            'unit_price' => 1500,
            'total_price' => 1500,
        ]);

        $collection = Collection::create([
            'invoice_id' => $invoice->id,
            'client_name' => 'John Doe',
            'service_type' => 'Package',
            'billing_amount' => 1680,
            'paid_amount' => 1680,
            'remaining_balance' => 0,
            'collection_status' => 'completed',
            'date' => now(),
            'travel_date' => now()->addDays(5),
        ]);

        CollectionPayment::create([
            'collection_id' => $collection->id,
            'amount' => 1680,
            'payment_date' => now(),
            'payment_method' => 'Cash',
            'balance' => 0,
        ]);

        $this->assertCount(1, $invoice->fresh()->payments);

        $response = $this->actingAs($admin)->postJson("/api/v1/billing/{$invoice->id}/send-email", [
            'email' => 'client@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        Mail::assertSent(TransactionNotificationMail::class, fn (TransactionNotificationMail $mail) => $mail->hasTo('client@example.com'));

        $failedMailer = \Mockery::mock(InvoiceDocumentMailService::class);
        $failedMailer->shouldReceive('send')->once()->andThrow(new \RuntimeException('SMTP unavailable'));
        $this->app->instance(InvoiceDocumentMailService::class, $failedMailer);

        $this->actingAs($admin)
            ->postJson("/api/v1/billing/{$invoice->id}/send-email", ['email' => 'client@example.com'])
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_collections_search_returns_settled_records_matching_query(): void
    {
        $admin = User::factory()->superAdmin()->create();

        Collection::create([
            'client_name' => 'Alpha BrowserQA Student',
            'service_type' => 'Educational Tour',
            'billing_amount' => 2400,
            'paid_amount' => 2400,
            'remaining_balance' => 0,
            'collection_status' => 'completed',
            'date' => now(),
            'travel_date' => now()->addDays(10),
        ]);

        Collection::create([
            'client_name' => 'Beta Other Client',
            'service_type' => 'Private Tour',
            'billing_amount' => 5000,
            'paid_amount' => 1000,
            'remaining_balance' => 4000,
            'collection_status' => 'partial',
            'date' => now(),
            'travel_date' => now()->addDays(10),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/collections?search=Alpha');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.client_name', 'Alpha BrowserQA Student');
    }

    public function test_route_estimate_resolves_philippine_landmarks_instantaneously(): void
    {
        $routeService = app(RouteEstimateService::class);
        $results = $routeService->search('SM Mall of Asia');

        $this->assertNotEmpty($results);
        $this->assertEquals('SM Mall of Asia, Pasay City, Metro Manila', $results[0]['label']);
        $this->assertEquals(14.5353, $results[0]['latitude']);
        $this->assertEquals(120.9822, $results[0]['longitude']);
    }
}
