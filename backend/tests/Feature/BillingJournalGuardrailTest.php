<?php

namespace Tests\Feature;

use App\Models\CharterRatePlan;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\EducationalTourProgram;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\Service;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\InvoiceFinalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BillingJournalGuardrailTest extends TestCase
{
    use RefreshDatabase;

    private function makeCollection(): Collection
    {
        return Collection::create([
            'client_name' => 'Guardrail Client',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'pick_up' => 'Manila',
            'drop_off' => 'Baguio',
            'rate' => 1000,
            'billing_amount' => 1000,
            'remaining_balance' => 1000,
            'paid_amount' => 0,
            'collection_status' => 'pending',
            'due_date' => now()->addDays(3)->toDateString(),
        ]);
    }

    public function test_catalog_price_is_authoritative_and_checkout_never_adds_client_submitted_tax(): void
    {
        $admin = User::factory()->superAdmin()->create();
        SystemSetting::setValue('vat_rate', 0.12);
        $service = Service::create([
            'name' => 'Authoritative Family Package',
            'description' => 'Catalog-owned pricing.',
            'category' => 'Tour Package',
            'service_type' => 'private_tour',
            'price' => 1000,
            'adult_price' => 1000,
            'child_price' => 500,
            'is_active' => true,
            'is_sales_catalog' => true,
        ]);

        $response = $this->actingAs($admin)->postJson('/api/v1/billing', [
            'customer_name' => 'Pricing Guardrail Customer',
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 2000,
            'tax_rate' => 0,
            'items' => [[
                'service_id' => $service->id,
                'item_name' => $service->name,
                'service_type' => 'private_tour',
                'quantity' => 2,
                'unit_price' => 1,
                'adults' => 1,
                'children' => 1,
                'adult_price' => 1,
                'child_price' => 1,
            ]],
        ]);

        $response->assertCreated();
        $invoiceId = $response->json('data.id');

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'subtotal' => 1500,
            'tax_amount' => 0,
            'total_amount' => 1500,
        ]);
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoiceId,
            'adult_price' => 1000,
            'child_price' => 500,
            'total_price' => 1500,
        ]);
    }

    public function test_typed_package_engines_recalculate_tampered_charter_and_education_prices(): void
    {
        $admin = User::factory()->superAdmin()->create();
        SystemSetting::setValue('vat_rate', 0.12);
        $charterService = Service::create([
            'name' => 'Server-priced Charter',
            'category' => 'Bus Rental',
            'service_type' => 'bus_rental',
            'price' => 1,
            'is_active' => true,
            'is_sales_catalog' => true,
        ]);
        $plan = CharterRatePlan::create([
            'service_id' => $charterService->id,
            'name' => 'Daily Charter',
            'vehicle_class' => 'bus',
            'base_price' => 1000,
            'included_hours' => 10,
            'included_kilometers' => 100,
            'extra_hour_rate' => 100,
            'extra_kilometer_rate' => 10,
            'overnight_rate' => 0,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $program = EducationalTourProgram::create([
            'name' => 'Science Program',
            'default_stops' => ['Science Center'],
            'minimum_students' => 10,
            'students_per_chaperone' => 20,
            'students_per_free_chaperone' => 20,
            'student_price' => 100,
            'additional_chaperone_price' => 50,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $finalizer = app(InvoiceFinalizationService::class);

        $charter = $finalizer->calculateItems([[
            'service_id' => $charterService->id,
            'item_name' => 'Tampered Charter',
            'service_type' => 'bus_rental',
            'quantity' => 2,
            'unit_price' => 1,
            'item_metadata' => [
                'rate_plan_id' => $plan->id,
                'starts_at' => '2030-01-15T08:00:00+08:00',
                'ends_at' => '2030-01-15T20:00:00+08:00',
                'estimated_kilometers' => 150,
                'requested_units' => 2,
                'is_fixed_rate' => false,
            ],
        ]], null, null, 0);

        $this->assertSame(1700.0, $charter['processedItems'][0]['unit_price']);
        $this->assertSame(3400.0, $charter['subtotal']);
        $this->assertSame(0.0, $charter['taxAmount']);
        $this->assertSame(3400.0, $charter['totalAmount']);

        $education = $finalizer->calculateItems([[
            'service_id' => null,
            'item_name' => 'Tampered Education Program',
            'service_type' => 'educational_tour',
            'quantity' => 99,
            'unit_price' => 1,
            'item_metadata' => [
                'program_id' => $program->id,
                'student_count' => 20,
                'tour_guide_count' => 2,
            ],
        ]], null, null, 0);

        $this->assertSame(2100.0, $education['processedItems'][0]['unit_price']);
        $this->assertSame(2100.0, $education['subtotal']);
        $this->assertSame(0.0, $education['taxAmount']);
        $this->assertSame(2100.0, $education['totalAmount']);
    }

    public function test_direct_mark_paid_cannot_fabricate_payment_state(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-NO-EVIDENCE',
            'customer_name' => 'No Evidence Customer',
            'subtotal' => 1000,
            'tax_amount' => 120,
            'total_amount' => 1120,
            'amount_received' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'balance' => 1120,
            'status' => 'pending_payment',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/billing/{$invoice->id}/status", ['status' => 'paid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->actingAs($admin)
            ->patchJson("/api/v1/billing/{$invoice->id}/status", ['status' => 'voided'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $invoice->refresh();
        $this->assertSame('pending_payment', $invoice->status);
        $this->assertEquals(0, $invoice->amount_received);
        $this->assertEquals(1120, $invoice->balance);
        $this->assertDatabaseCount('collection_payments', 0);
    }

    public function test_confirm_endpoint_cannot_invent_a_cash_payment(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/confirm")
            ->assertStatus(409);

        $this->assertDatabaseCount('collection_payments', 0);
        $this->assertEquals(1000, $collection->fresh()->remaining_balance);
    }

    public function test_collection_update_cannot_replace_payments_or_duplicate_the_journal(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $this->actingAs($admin)->postJson("/api/v1/collections/{$collection->id}/add-payment", [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 250,
            'idempotency_key' => 'guardrail-payment-1',
        ])->assertOk();

        $payment = CollectionPayment::where('collection_id', $collection->id)->firstOrFail();
        $journalQuery = JournalEntry::where('reference_type', CollectionPayment::class)
            ->where('reference_id', $payment->id);
        $this->assertSame(1, $journalQuery->count());

        $this->actingAs($admin)->putJson("/api/v1/collections/{$collection->id}", [
            'pick_up' => 'New Pickup',
            'rate' => 5,
            'payments' => [[
                'payment_date' => now()->toDateString(),
                'payment_method' => 'Cash',
                'amount' => 999,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['payments', 'rate']);

        $this->actingAs($admin)->putJson("/api/v1/collections/{$collection->id}", [
            'pick_up' => 'Updated Pickup',
        ])->assertOk();

        $this->assertSame('Updated Pickup', $collection->fresh()->pick_up);
        $this->assertSame(1, CollectionPayment::where('collection_id', $collection->id)->count());
        $this->assertEquals(250, $payment->fresh()->amount);
        $this->assertSame(1, $journalQuery->count());
    }

    public function test_posted_payment_model_rejects_updates_and_deletes(): void
    {
        $collection = $this->makeCollection();
        $payment = $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 250,
            'idempotency_key' => 'immutable-payment-1',
        ]);

        foreach (['update', 'delete'] as $operation) {
            try {
                $operation === 'update'
                    ? $payment->update(['amount' => 300])
                    : $payment->delete();
                $this->fail("Expected posted payment {$operation} to be rejected.");
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('payment', $exception->errors());
            }
        }

        $this->assertDatabaseHas('collection_payments', [
            'id' => $payment->id,
            'amount' => 250,
        ]);
        $this->assertSame(1, JournalEntry::where('reference_type', CollectionPayment::class)
            ->where('reference_id', $payment->id)
            ->count());
    }

    public function test_terminal_invoice_cannot_receive_payment_or_be_resurrected_by_reconciliation(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-TERMINAL-GUARD',
            'customer_name' => 'Cancelled Customer',
            'subtotal' => 1000,
            'tax_amount' => 0,
            'total_amount' => 1000,
            'amount_received' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'balance' => 1000,
            'status' => 'cancelled',
            'created_by' => $admin->id,
        ]);
        $collection = Collection::create([
            'client_name' => 'Cancelled Customer',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 1000,
            'billing_amount' => 1000,
            'remaining_balance' => 1000,
            'paid_amount' => 0,
            'collection_status' => 'pending',
            'invoice_id' => $invoice->id,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", [
                'payment_date' => now()->toDateString(),
                'payment_method' => 'Cash',
                'amount' => 1000,
                'idempotency_key' => 'terminal-payment-attempt',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment');

        $this->assertDatabaseCount('collection_payments', 0);

        // Even legacy/imported evidence followed by a recalculation must retain
        // the terminal business state rather than silently resurrecting it.
        $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 1000,
            'idempotency_key' => 'legacy-terminal-evidence',
        ]);
        $collection->recalculate();
        $this->assertSame('cancelled', $invoice->fresh()->status);

        $this->actingAs($admin)
            ->patchJson("/api/v1/billing/{$invoice->id}/status", ['status' => 'paid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertSame('cancelled', $invoice->fresh()->status);
    }
}
