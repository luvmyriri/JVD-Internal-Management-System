<?php

namespace Tests\Feature;

use App\Jobs\SendCollectionStatementJob;
use App\Jobs\SendInvoiceDocumentsJob;
use App\Mail\TransactionNotificationMail;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerPassenger;
use App\Models\JoinerReservation;
use App\Models\Service;
use App\Models\User;
use App\Services\CollectionStatementService;
use App\Services\InvoiceDocumentCacheService;
use App\Services\InvoiceDocumentDispatchService;
use App\Services\InvoiceDocumentMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerDocumentDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_delivery_is_queued_with_visible_recipient_and_can_be_retried(): void
    {
        Queue::fake();
        [$admin, $invoice] = $this->paidInvoice();

        $this->actingAs($admin)
            ->postJson("/api/v1/billing/{$invoice->id}/send-email", ['email' => 'first@example.com'])
            ->assertAccepted();
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => 'first@example.com',
        ]);
        $this->actingAs($admin)->getJson("/api/v1/transactions/{$invoice->id}")
            ->assertOk()->assertJsonPath('data.document_delivery.status', 'queued')
            ->assertJsonPath('data.document_delivery.recipient', 'first@example.com');

        $invoice->forceFill([
            'document_delivery_status' => 'failed',
            'document_delivery_error' => 'Previous attempt failed.',
        ])->save();
        app(InvoiceDocumentDispatchService::class)->queue($invoice->fresh(), recipient: 'retry@example.com');

        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => 'retry@example.com',
            'document_delivery_error' => null,
        ]);
        Queue::assertPushed(SendInvoiceDocumentsJob::class, 2);
    }

    public function test_invoice_delivery_job_marks_sent_and_exhausted_retries_mark_failed(): void
    {
        Storage::fake('local');
        [, $invoice] = $this->paidInvoice();
        config(['mail.transactional_mailer' => 'array']);
        Mail::mailer('array')->getSymfonyTransport()->flush();

        $job = new SendInvoiceDocumentsJob($invoice->id, recipient: 'documents@example.com');
        $job->handle(app(InvoiceDocumentMailService::class));
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'document_delivery_status' => 'sent',
            'document_delivery_recipient' => 'documents@example.com',
        ]);
        $this->assertNotNull($invoice->fresh()->document_delivery_sent_at);

        $job->failed(new \RuntimeException('SMTP unavailable'));
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id, 'document_delivery_status' => 'failed']);
        $this->assertNotNull($invoice->fresh()->document_delivery_failed_at);
    }

    public function test_replaced_invoice_delivery_job_cannot_send_or_overwrite_the_new_attempt(): void
    {
        Queue::fake();
        Storage::fake('local');
        [, $invoice] = $this->paidInvoice();
        config(['mail.transactional_mailer' => 'array']);
        $mailer = Mail::mailer('array');
        $mailer->getSymfonyTransport()->flush();

        $dispatch = app(InvoiceDocumentDispatchService::class);
        $dispatch->queue($invoice, recipient: 'old@example.com');
        $oldToken = $invoice->fresh()->document_delivery_token;
        $invoice->forceFill(['document_delivery_queued_at' => now()->subMinutes(6)])->save();
        $dispatch->queue($invoice->fresh(), recipient: 'new@example.com');
        $newToken = $invoice->fresh()->document_delivery_token;
        $this->assertNotSame($oldToken, $newToken);

        $oldJob = new SendInvoiceDocumentsJob($invoice->id, recipient: 'old@example.com', deliveryToken: $oldToken);
        $oldJob->handle(app(InvoiceDocumentMailService::class));
        $oldJob->failed(new \RuntimeException('Stale SMTP failure'));
        $this->assertCount(0, $mailer->getSymfonyTransport()->messages());
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => 'new@example.com',
        ]);

        (new SendInvoiceDocumentsJob($invoice->id, recipient: 'new@example.com', deliveryToken: $newToken))
            ->handle(app(InvoiceDocumentMailService::class));
        $this->assertCount(1, $mailer->getSymfonyTransport()->messages());
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'document_delivery_status' => 'sent',
            'document_delivery_recipient' => 'new@example.com',
        ]);
    }

    public function test_active_invoice_delivery_cannot_be_duplicated_or_redirected(): void
    {
        Queue::fake();
        [, $invoice] = $this->paidInvoice();
        $dispatch = app(InvoiceDocumentDispatchService::class);

        $this->assertTrue($dispatch->queue($invoice, recipient: 'first@example.com'));
        $this->assertFalse($dispatch->queue($invoice->fresh(), recipient: 'first@example.com'));
        Queue::assertPushed(SendInvoiceDocumentsJob::class, 1);

        $this->expectException(\InvalidArgumentException::class);
        $dispatch->queue($invoice->fresh(), recipient: 'different@example.com');
    }

    public function test_stalled_invoice_delivery_is_visible_and_can_be_requeued(): void
    {
        Queue::fake();
        [$admin, $invoice] = $this->paidInvoice();
        $dispatch = app(InvoiceDocumentDispatchService::class);
        $dispatch->queue($invoice, recipient: 'documents@example.com');
        $oldToken = $invoice->fresh()->document_delivery_token;
        $invoice->forceFill(['document_delivery_queued_at' => now()->subMinutes(6)])->save();

        $this->actingAs($admin)->getJson("/api/v1/transactions/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.document_delivery.status', 'stalled');

        $this->actingAs($admin)
            ->postJson("/api/v1/billing/{$invoice->id}/send-email", ['email' => 'documents@example.com'])
            ->assertAccepted();
        $this->assertNotSame($oldToken, $invoice->fresh()->document_delivery_token);
        Queue::assertPushed(SendInvoiceDocumentsJob::class, 2);
    }

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

    public function test_invoice_preserves_customer_and_package_identity_with_itineraries(): void
    {
        [, $invoice] = $this->paidInvoice();
        $invoice->items->first()->service->update(['category' => 'Tour Package']);
        $invoice->itineraries()->create(['day_number' => 1, 'location' => 'First stop only', 'activity_description' => 'Arrival']);
        $invoice->load(Invoice::operationalDocumentRelations());
        $html = view('pdf.invoice', ['invoice' => $invoice])->render();

        $this->assertStringContainsString('Bill To', $html);
        $this->assertStringContainsString('Document Customer', $html);
        $this->assertStringContainsString('documents@example.com', $html);
        $this->assertStringContainsString('Customer Document Service', $html);
        $this->assertStringNotContainsString('First stop only', $html);
    }

    public function test_partial_payment_email_sends_real_pdf_attachments_without_a_live_transport(): void
    {
        Storage::fake('local');
        [, $invoice] = $this->paidInvoice();
        $invoice->update(['status' => 'partial', 'amount_received' => 500, 'balance' => 2000]);
        config(['mail.transactional_mailer' => 'array']);
        $mailer = Mail::mailer('array');
        $mailer->getSymfonyTransport()->flush();

        app(InvoiceDocumentMailService::class)->send($invoice, 'documents@example.com');
        $messages = $mailer->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $email = $messages->first()->getOriginalMessage();
        $pdfs = collect($email->getAttachments())->filter(fn ($part) => $part->getMediaSubtype() === 'pdf');
        $this->assertCount(3, $pdfs);
        $this->assertContains('Payment_Receipt_INV-DOCUMENT-001.pdf', $pdfs->map(fn ($part) => $part->getFilename())->all());
        foreach ($pdfs as $pdf) {
            $this->assertStringStartsWith('%PDF-', $pdf->getBody());
        }
    }

    public function test_booking_confirmation_and_invoice_are_delivered_as_one_email(): void
    {
        Storage::fake('local');
        [, $invoice] = $this->paidInvoice();
        config(['mail.transactional_mailer' => 'array']);
        $mailer = Mail::mailer('array');
        $mailer->getSymfonyTransport()->flush();

        app(InvoiceDocumentMailService::class)->send($invoice, 'documents@example.com', true);

        $messages = $mailer->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $message = $messages->first()->getOriginalMessage();
        $this->assertStringContainsString('Booking confirmed', $message->getSubject());
        $this->assertStringContainsString('Your booking is confirmed.', $message->getHtmlBody());
        $this->assertContains("Invoice_{$invoice->invoice_number}.pdf", collect($message->getAttachments())->map(fn ($part) => $part->getFilename())->all());
    }

    public function test_unpaid_email_does_not_claim_a_deposit_was_received(): void
    {
        [, $invoice] = $this->paidInvoice();
        $invoice->update(['status' => 'pending_payment', 'amount_received' => 0, 'balance' => 2500]);
        $invoice->load(Invoice::operationalDocumentRelations());
        $html = view('emails.transaction-receipt', ['invoice' => $invoice])->render();
        $this->assertStringContainsString('No payment has been recorded yet.', $html);
        $this->assertStringNotContainsString('downpayment has been successfully credited', $html);
        $attachments = (new TransactionNotificationMail($invoice))->attachments();
        $this->assertNotContains('Payment_Receipt_INV-DOCUMENT-001.pdf', collect($attachments)->pluck('as')->all());
    }

    public function test_invoice_distinguishes_cash_tendered_from_payment_and_refreshes_cached_documents(): void
    {
        Storage::fake('local');
        [, $invoice] = $this->paidInvoice();
        $documents = app(InvoiceDocumentCacheService::class);
        $before = $documents->contents($invoice, InvoiceDocumentCacheService::INVOICE);
        $invoice->update(['amount_received' => 3000, 'change' => 500]);
        $after = $documents->contents($invoice->fresh(), InvoiceDocumentCacheService::INVOICE);
        $this->assertNotSame(hash('sha256', $before), hash('sha256', $after));
        $this->assertSame($after, $documents->contents($invoice->fresh(), InvoiceDocumentCacheService::INVOICE));

        $html = view('pdf.invoice', ['invoice' => $invoice])->render();
        $this->assertMatchesRegularExpression('/Amount Paid:<\/div>\s*<div[^>]*>PHP&nbsp;2,500\.00/', $html);
        $this->assertMatchesRegularExpression('/Amount Tendered:<\/div>\s*<div[^>]*>PHP&nbsp;3,000\.00/', $html);
    }

    public function test_joiner_seat_codes_are_available_to_customer_documents(): void
    {
        $invoice = new Invoice;
        foreach (['booking', 'charterBooking', 'educationalTourParticipantBooking'] as $relation) {
            $invoice->setRelation($relation, null);
        }
        $reservation = new JoinerReservation;
        $passenger = new JoinerPassenger;
        $passenger->setRelation('seat', new JoinerDepartureSeat(['seat_code' => 'A1']));
        $reservation->setRelation('passengers', collect([$passenger]));
        $invoice->setRelation('joinerReservation', $reservation);
        $this->assertSame(['A1'], $invoice->seat_map);
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
