<?php

namespace Tests\Feature;

use App\Jobs\SendCollectionStatementJob;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use App\Models\User;
use App\Services\CollectionStatementService;
use App\Services\InvoiceDocumentCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerDocumentDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_transaction_financial_documents_render_as_valid_pdfs(): void
    {
        Storage::fake('local');
        [$admin, $invoice] = $this->paidInvoice();
        $documents = app(InvoiceDocumentCacheService::class);

        foreach ([
            InvoiceDocumentCacheService::INVOICE,
            InvoiceDocumentCacheService::PAYMENT_RECEIPT,
            InvoiceDocumentCacheService::STATEMENT,
        ] as $document) {
            $contents = $documents->contents($invoice->fresh(), $document);
            $this->assertStringStartsWith('%PDF-', $contents, "{$document} must be a valid PDF.");

            $response = $this->actingAs($admin)
                ->get("/api/v1/transactions/{$invoice->id}/documents/{$document}");
            $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
            $this->assertStringStartsWith('%PDF-', $response->getContent());
        }
    }

    public function test_standalone_collection_statement_renders_and_queues_delivery(): void
    {
        Queue::fake();
        $admin = User::factory()->superAdmin()->create();
        $customer = Customer::factory()->create(['email' => 'collections@example.com']);
        $collection = Collection::create([
            'customer_id' => $customer->id,
            'client_name' => 'Standalone Collection Client',
            'service_type' => 'Private Tour',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 5000,
            'billing_amount' => 5000,
            'paid_amount' => 1000,
            'remaining_balance' => 4000,
            'collection_status' => 'partial',
        ]);
        CollectionPayment::create([
            'collection_id' => $collection->id,
            'amount' => 1000,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'balance' => 4000,
        ]);

        $contents = app(CollectionStatementService::class)->contents($collection->fresh());
        $this->assertStringStartsWith('%PDF-', $contents);

        $this->actingAs($admin)
            ->get("/api/v1/collections/{$collection->id}/view-soa")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->actingAs($admin)
            ->get("/api/v1/collections/{$collection->id}/download-soa")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/send-soa")
            ->assertAccepted()
            ->assertJsonPath('success', true);

        Queue::assertPushed(SendCollectionStatementJob::class, fn (SendCollectionStatementJob $job) => $job->collectionId === $collection->id && $job->recipient === 'collections@example.com'
        );
    }

    /** @return array{User, Invoice} */
    private function paidInvoice(): array
    {
        $admin = User::factory()->superAdmin()->create();
        $customer = Customer::factory()->create(['email' => 'documents@example.com']);
        $service = Service::create([
            'name' => 'Customer Document Service',
            'category' => 'Custom',
            'price' => 2500,
        ]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-DOCUMENT-001',
            'customer_id' => $customer->id,
            'customer_name' => 'Document Customer',
            'customer_email' => 'documents@example.com',
            'subtotal' => 2500,
            'tax_amount' => 0,
            'total_amount' => 2500,
            'amount_received' => 2500,
            'balance' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'status' => 'paid',
            'created_by' => $admin->id,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'item_name' => $service->name,
            'quantity' => 1,
            'unit_price' => 2500,
            'total_price' => 2500,
        ]);
        $collection = Collection::create([
            'invoice_id' => $invoice->id,
            'customer_id' => $customer->id,
            'client_name' => 'Document Customer',
            'service_type' => 'Custom',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 2500,
            'billing_amount' => 2500,
            'paid_amount' => 2500,
            'remaining_balance' => 0,
            'collection_status' => 'completed',
        ]);
        CollectionPayment::create([
            'collection_id' => $collection->id,
            'amount' => 2500,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'balance' => 0,
        ]);

        return [$admin, $invoice];
    }
}
