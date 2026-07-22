<?php

namespace Tests\Feature;

use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use App\Models\User;
use App\Services\InvoiceFinalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class InvoicePaymentIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_payment_rules_are_enforced_by_the_shared_finalizer(): void
    {
        $finalizer = app(InvoiceFinalizationService::class);

        foreach ([
            ['full', 999.99, 'Full cash payment must cover the invoice total.'],
            ['downpayment', 0, 'A cash downpayment must be greater than zero.'],
            ['downpayment', 1000, 'A downpayment must be less than the invoice total.'],
        ] as [$paymentType, $received, $expectedMessage]) {
            try {
                $finalizer->computePaymentStatus('Cash', $paymentType, 1000, $received);
                $this->fail("Expected validation to fail for {$paymentType} at {$received}.");
            } catch (ValidationException $exception) {
                $this->assertStringContainsString(
                    $expectedMessage,
                    $exception->errors()['amount_received'][0]
                );
            }
        }

        $this->assertSame(
            ['status' => 'paid', 'balance' => 0],
            $finalizer->computePaymentStatus('Cash', 'full', 1000, 1200)
        );
        $this->assertSame(
            ['status' => 'partial', 'balance' => 750.0],
            $finalizer->computePaymentStatus('Cash', 'downpayment', 1000, 250)
        );
    }

    public function test_paymongo_rows_include_vat_and_exactly_match_the_invoice_total(): void
    {
        config()->set('services.paymongo.secret_key', 'sk_test_invoice_integrity');

        Http::fake([
            'api.paymongo.com/*' => Http::response([
                'data' => [
                    'id' => 'cs_test_vat_exact',
                    'attributes' => ['checkout_url' => 'https://checkout.test/cs_test_vat_exact'],
                ],
            ]),
        ]);

        $user = User::factory()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PAYMONGO-VAT',
            'customer_name' => 'Test Customer',
            'subtotal' => 1000,
            'tax_amount' => 120,
            'total_amount' => 1120,
            'amount_received' => 0,
            'payment_method' => 'GCash',
            'payment_type' => 'full',
            'balance' => 1120,
            'status' => 'pending_payment',
            'created_by' => $user->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => null,
            'item_name' => 'Bespoke travel arrangement',
            'service_type' => 'custom_arrangement',
            'quantity' => 2,
            'unit_price' => 500,
            'total_price' => 1000,
        ]);

        app(InvoiceFinalizationService::class)->finalizeWithinTransaction($invoice, [[
            'service_id' => null,
            'item_name' => 'Bespoke travel arrangement',
            'service_type' => 'custom_arrangement',
            'quantity' => 2,
            'unit_price' => 500,
            'total_price' => 1000,
            'adults' => null,
            'children' => null,
        ]]);

        Http::assertSent(function (Request $request): bool {
            $rows = $request->data()['data']['attributes']['line_items'];
            $sentCentavos = collect($rows)->sum(
                fn (array $row): int => $row['amount'] * $row['quantity']
            );

            return $sentCentavos === 112000
                && collect($rows)->contains(
                    fn (array $row): bool => $row['name'] === 'Value-added tax (VAT)'
                        && $row['amount'] === 12000
                );
        });

        $this->assertSame('cs_test_vat_exact', $invoice->fresh()->payment_id);
    }

    public function test_passenger_rates_are_snapshotted_and_do_not_follow_catalog_edits(): void
    {
        $user = User::factory()->create();
        $service = Service::create([
            'name' => 'Family Tour',
            'category' => 'Tour Package',
            'service_type' => 'private_tour',
            'price' => 1000,
            'adult_price' => 1000,
            'child_price' => 500,
        ]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-RATE-SNAPSHOT',
            'customer_name' => 'Family Customer',
            'subtotal' => 2500,
            'tax_amount' => 300,
            'total_amount' => 2800,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 2800,
            'balance' => 0,
            'status' => 'paid',
            'created_by' => $user->id,
        ]);

        $item = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'quantity' => 3,
            'unit_price' => 833.33,
            'total_price' => 2500,
            'adults' => 2,
            'children' => 1,
        ]);

        $this->assertEquals(1000, $item->adult_price);
        $this->assertEquals(500, $item->child_price);

        $service->update(['adult_price' => 2000, 'child_price' => 1250]);
        app(InvoiceFinalizationService::class)->captureSnapshot($invoice);

        $resource = (new InvoiceResource(
            $invoice->fresh()->load(['items.service'])
        ))->resolve();

        $this->assertSame(1000.0, $resource['items'][0]['adult_price']);
        $this->assertSame(500.0, $resource['items'][0]['child_price']);
        $this->assertEquals(1000, $invoice->fresh()->finalized_snapshot['items'][0]['adult_price']);
        $this->assertEquals(500, $invoice->fresh()->finalized_snapshot['items'][0]['child_price']);
    }
}
