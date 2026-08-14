<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionPaymentIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private function makeCollection(): Collection
    {
        return Collection::create([
            'client_name' => 'Test Client',
            'date' => now()->format('Y-m-d'),
            'travel_date' => now()->addDays(3)->format('Y-m-d'),
            'pick_up' => 'Manila',
            'drop_off' => 'Baguio',
            'rate' => 1000,
            'billing_amount' => 1000,
            'remaining_balance' => 1000,
            'paid_amount' => 0,
            'collection_status' => 'pending',
            'due_date' => now()->addDays(7)->format('Y-m-d'),
        ]);
    }

    public function test_repeated_idempotency_key_does_not_double_post_payment(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $payload = [
            'payment_date' => now()->format('Y-m-d'),
            'payment_method' => 'Cash',
            'amount' => 500,
            'idempotency_key' => 'test-key-abc-123',
        ];

        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", $payload)
            ->assertOk();

        // Same key again — simulates a double-click / network retry.
        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", $payload)
            ->assertOk();

        $this->assertSame(
            1,
            CollectionPayment::where('collection_id', $collection->id)->count(),
            'A repeated idempotency key must record exactly one payment.'
        );
    }

    public function test_missing_idempotency_key_still_records_normally(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", [
                'payment_date' => now()->format('Y-m-d'),
                'payment_method' => 'Cash',
                'amount' => 250,
            ])
            ->assertOk();

        $this->assertSame(1, CollectionPayment::where('collection_id', $collection->id)->count());
    }

    public function test_idempotency_key_cannot_be_reused_for_another_collection(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $first = $this->makeCollection();
        $second = $this->makeCollection();
        $payload = [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 100,
            'idempotency_key' => 'collection-scoped-key',
        ];

        $this->actingAs($admin)->postJson("/api/v1/collections/{$first->id}/add-payment", $payload)->assertOk();
        $this->actingAs($admin)
            ->postJson("/api/v1/collections/{$second->id}/add-payment", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('idempotency_key');

        $this->assertDatabaseMissing('collection_payments', ['collection_id' => $second->id]);
    }

    public function test_one_cent_overpayment_is_rejected_without_partial_persistence(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $this->actingAs($admin)->postJson("/api/v1/collections/{$collection->id}/add-payment", [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 999.99,
            'idempotency_key' => 'almost-settled',
        ])->assertOk();

        $this->actingAs($admin)->postJson("/api/v1/collections/{$collection->id}/add-payment", [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 0.02,
            'idempotency_key' => 'one-cent-over',
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->assertSame(1, CollectionPayment::where('collection_id', $collection->id)->count());
        $this->assertEqualsWithDelta(0.01, (float) $collection->fresh()->remaining_balance, 0.00001);
    }

    public function test_collection_creation_cannot_bypass_payment_invariants_with_nested_payments(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->postJson('/api/v1/collections', [
            'client_name' => 'Nested Payment Attempt',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 100,
            'payments' => [[
                'payment_date' => now()->toDateString(),
                'payment_method' => 'Cash',
                'amount' => 1000,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('payments');

        $this->assertDatabaseMissing('collections', ['client_name' => 'Nested Payment Attempt']);
        $this->assertDatabaseCount('collection_payments', 0);
    }

    public function test_manual_payment_rechecks_locked_payment_evidence_instead_of_stale_balance(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();
        $collection->payments()->create([
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 900,
            'balance' => 100,
            'idempotency_key' => 'already-posted',
        ]);

        // Simulate stale denormalized summary columns left by another process.
        $collection->forceFill([
            'paid_amount' => 0,
            'remaining_balance' => 1000,
            'collection_status' => 'pending',
        ])->saveQuietly();

        $this->actingAs($admin)->postJson("/api/v1/collections/{$collection->id}/add-payment", [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 200,
            'idempotency_key' => 'would-overpost',
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->assertSame(1, $collection->payments()->count());
        $this->assertDatabaseMissing('collection_payments', ['idempotency_key' => 'would-overpost']);
    }
}
