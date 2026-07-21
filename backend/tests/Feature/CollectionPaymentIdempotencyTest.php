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
            'client_name'       => 'Test Client',
            'date'              => now()->format('Y-m-d'),
            'travel_date'       => now()->addDays(3)->format('Y-m-d'),
            'pick_up'           => 'Manila',
            'drop_off'          => 'Baguio',
            'rate'              => 1000,
            'billing_amount'    => 1000,
            'remaining_balance' => 1000,
            'paid_amount'       => 0,
            'collection_status' => 'pending',
            'due_date'          => now()->addDays(7)->format('Y-m-d'),
        ]);
    }

    public function test_repeated_idempotency_key_does_not_double_post_payment(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $collection = $this->makeCollection();

        $payload = [
            'payment_date'    => now()->format('Y-m-d'),
            'payment_method'  => 'Cash',
            'amount'          => 500,
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
                'payment_date'   => now()->format('Y-m-d'),
                'payment_method' => 'Cash',
                'amount'         => 250,
            ])
            ->assertOk();

        $this->assertSame(1, CollectionPayment::where('collection_id', $collection->id)->count());
    }
}
