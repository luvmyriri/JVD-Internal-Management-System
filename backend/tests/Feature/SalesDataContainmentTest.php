<?php

namespace Tests\Feature;

use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesDataContainmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_unrelated_authenticated_role_cannot_read_sales_records_or_documents(): void
    {
        $salesAgent = User::factory()->create(['role' => 'reservation_officer']);
        $order = $this->salesOrder($salesAgent);
        $driver = User::factory()->create(['role' => 'driver']);

        $this->actingAs($driver)
            ->getJson("/api/v1/sales/orders/{$order->id}")
            ->assertForbidden();

        $this->actingAs($driver)
            ->get("/api/v1/sales/orders/{$order->id}/documents/quotation")
            ->assertForbidden();
    }

    public function test_permitted_sales_staff_can_read_sales_records(): void
    {
        $salesAgent = User::factory()->create(['role' => 'reservation_officer']);
        $order = $this->salesOrder($salesAgent);

        $this->actingAs($salesAgent)
            ->getJson("/api/v1/sales/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.order_number', $order->order_number);
    }

    public function test_sales_reads_require_completed_password_change_and_verified_two_factor(): void
    {
        $passwordChangeRequired = User::factory()->mustChangePassword()->create([
            'role' => 'reservation_officer',
        ]);

        $this->actingAs($passwordChangeRequired)
            ->getJson('/api/v1/sales/orders')
            ->assertForbidden()
            ->assertJsonPath('requires_password_change', true);

        $unverifiedTwoFactor = User::factory()->create([
            'role' => 'reservation_officer',
            'two_factor_verified_at' => null,
        ]);

        $this->actingAs($unverifiedTwoFactor)
            ->getJson('/api/v1/sales/orders')
            ->assertForbidden()
            ->assertJsonPath('requires_2fa', true);
    }

    public function test_operational_trip_and_conflict_data_is_not_publicly_enumerable(): void
    {
        $this->getJson('/api/v1/public/trip-tickets')
            ->assertNotFound();

        $this->getJson('/api/v1/public/conflict-check?travel_date=2026-08-20')
            ->assertNotFound();

        // The supported operations endpoints remain available, but only behind
        // the authenticated password-change and 2FA middleware stack.
        $this->getJson('/api/v1/trip-tickets')
            ->assertUnauthorized();

        $this->getJson('/api/v1/trip-tickets/check-conflict?date_of_travel=2026-08-20')
            ->assertUnauthorized();
    }

    private function salesOrder(User $agent): SalesOrder
    {
        return SalesOrder::create([
            'order_number' => 'ORD-CONTAINMENT-'.$agent->id,
            'agent_id' => $agent->id,
            'status' => 'draft',
            'subtotal' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'amount_paid' => 0,
            'balance' => 0,
        ]);
    }
}
