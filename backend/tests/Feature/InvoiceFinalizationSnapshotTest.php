<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use App\Models\User;
use App\Services\InvoiceFinalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceFinalizationSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshot_freezes_billed_facts_and_is_immutable(): void
    {
        $user = User::factory()->create();
        $service = Service::create([
            'name'     => 'Baguio Day Tour',
            'category' => 'Travel',
            'price'    => 500,
        ]);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-SNAP-1',
            'customer_name'  => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal'       => 1000,
            'tax_amount'     => 120,
            'total_amount'   => 1120,
            'payment_method' => 'Cash',
            'status'         => 'pending',
            'created_by'     => $user->id,
        ]);
        InvoiceItem::create([
            'invoice_id'  => $invoice->id,
            'service_id'  => $service->id,
            'quantity'    => 2,
            'unit_price'  => 500,
            'total_price' => 1000,
        ]);

        $svc = app(InvoiceFinalizationService::class);
        $svc->captureSnapshot($invoice);
        $invoice->refresh();

        $this->assertNotNull($invoice->finalized_at);
        $snap = $invoice->finalized_snapshot;
        $this->assertSame('Juan Dela Cruz', $snap['customer']['name']);
        $this->assertEquals(1120, $snap['totals']['total_amount']);
        $this->assertCount(1, $snap['items']);
        $this->assertSame('Baguio Day Tour', $snap['items'][0]['service_name']);
        $this->assertEquals(500, $snap['items'][0]['unit_price']);

        // Immutability: mutate the invoice and its service, re-capture — snapshot must not change.
        $invoice->update(['customer_name' => 'Changed Name', 'total_amount' => 9999]);
        $service->update(['name' => 'Renamed Service', 'price' => 1]);
        $svc->captureSnapshot($invoice);
        $invoice->refresh();

        $this->assertSame('Juan Dela Cruz', $invoice->finalized_snapshot['customer']['name']);
        $this->assertEquals(1120, $invoice->finalized_snapshot['totals']['total_amount']);
        $this->assertSame('Baguio Day Tour', $invoice->finalized_snapshot['items'][0]['service_name']);
    }
}
