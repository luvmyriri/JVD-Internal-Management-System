<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\SalesRefund;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class FinancialRouteAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounting_view_permission_is_read_only_for_collections(): void
    {
        $viewer = $this->userWithAccountingPermissions(['can_view' => true]);
        $collection = $this->makeCollection();

        $this->actingAs($viewer)->getJson('/api/v1/collections')->assertOk();
        $this->actingAs($viewer)->getJson("/api/v1/collections/{$collection->id}")->assertOk();

        $this->actingAs($viewer)->postJson("/api/v1/collections/{$collection->id}/add-payment", $this->paymentPayload())->assertForbidden();
        $this->actingAs($viewer)->patchJson("/api/v1/collections/{$collection->id}/remarks", ['remarks' => 'No'])->assertForbidden();
        $this->actingAs($viewer)->postJson("/api/v1/collections/{$collection->id}/refund")->assertForbidden();
        $this->actingAs($viewer)->deleteJson("/api/v1/collections/{$collection->id}")->assertForbidden();
    }

    public function test_dynamic_create_and_edit_permissions_only_unlock_their_own_collection_actions(): void
    {
        $creator = $this->userWithAccountingPermissions(['can_create' => true]);
        $editor = $this->userWithAccountingPermissions(['can_edit' => true]);
        $collection = $this->makeCollection();

        $this->actingAs($creator)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", $this->paymentPayload())
            ->assertOk();
        $this->actingAs($creator)
            ->patchJson("/api/v1/collections/{$collection->id}/remarks", ['remarks' => 'No'])
            ->assertForbidden();

        $this->actingAs($editor)
            ->patchJson("/api/v1/collections/{$collection->id}/remarks", ['remarks' => 'Reviewed'])
            ->assertOk();
        $this->actingAs($editor)
            ->postJson("/api/v1/collections/{$collection->id}/refund")
            ->assertStatus(409);
        $this->actingAs($editor)
            ->postJson("/api/v1/collections/{$collection->id}/add-payment", $this->paymentPayload('second-key'))
            ->assertForbidden();
    }

    public function test_accounting_view_permission_cannot_reach_any_non_collection_financial_write_family(): void
    {
        $viewer = $this->userWithAccountingPermissions(['can_view' => true]);

        $this->actingAs($viewer)->getJson('/api/v1/billing/services')->assertOk();
        $this->actingAs($viewer)->getJson('/api/v1/billing')->assertOk();

        $writeRoutes = [
            ['POST', '/api/v1/billing/services'],
            ['POST', '/api/v1/billing/services/upload-image'],
            ['POST', '/api/v1/billing'],
            ['POST', '/api/v1/contracts/draft'],
            ['POST', '/api/v1/accounting/readiness/runs'],
            ['POST', '/api/v1/accounting/opening-balances'],
            ['POST', '/api/v1/accounting/journal-entries'],
            ['POST', '/api/v1/accounting/journal-entries/import'],
            ['POST', '/api/v1/liquidations'],
        ];

        foreach ($writeRoutes as [$method, $uri]) {
            $response = $this->actingAs($viewer)->json($method, $uri);
            $this->assertSame(403, $response->status(), "{$method} {$uri} must be action-gated before controller dispatch.");
        }

        $expectedActionGates = [
            'billing.services.store' => 'accounting:create',
            'billing.services.upload-image' => 'accounting:create',
            'billing.services.update' => 'accounting:edit',
            'billing.services.delete' => 'accounting:delete',
            'billing.store' => 'accounting:create',
            'billing.status.update' => 'accounting:edit',
            'billing.send-email' => 'accounting:edit',
            'contracts.generate-for-invoice' => 'accounting:create',
            'contracts.draft' => 'accounting:create',
            'contracts.update-draft' => 'accounting:edit',
            'contracts.payment-schedule' => 'accounting:edit',
            'contracts.send' => 'accounting:edit',
            'contracts.sign-at-counter' => 'accounting:edit',
            'contracts.void' => 'accounting:edit',
            'contracts.amendments.create' => 'accounting:create',
            'contract-amendments.send' => 'accounting:edit',
            'accounting.readiness.run' => 'accounting:create',
            'accounting.opening-balances.store' => 'accounting:create',
            'accounting.opening-balances.approve' => 'accounting:edit',
            'accounting.opening-balances.post' => 'accounting:edit',
            'accounting.journal-entries.store' => 'accounting:create',
            'accounting.journal-entries.import' => 'accounting:create',
            'liquidations.store' => 'accounting:create',
            'liquidations.update' => 'accounting:edit',
            'liquidations.settle' => 'accounting:edit',
            'liquidations.destroy' => 'accounting:delete',
        ];

        foreach ($expectedActionGates as $routeName => $permission) {
            $route = Route::getRoutes()->getByName($routeName);
            $this->assertNotNull($route, "{$routeName} must remain registered.");
            $this->assertStringContainsString($permission, implode(' ', $route->gatherMiddleware()), "{$routeName} must require {$permission}.");
        }
    }

    public function test_dynamic_accounting_actions_unlock_only_the_matching_service_catalog_write(): void
    {
        $creator = $this->userWithAccountingPermissions(['can_create' => true]);
        $editor = $this->userWithAccountingPermissions(['can_edit' => true]);
        $deleter = $this->userWithAccountingPermissions(['can_delete' => true]);

        $created = $this->actingAs($creator)->postJson('/api/v1/billing/services', [
            'name' => 'Authorized Catalog Service',
            'category' => 'Custom',
            'price' => 500,
        ])->assertCreated()->json('data');

        $service = Service::findOrFail($created['id']);
        $this->actingAs($creator)->putJson("/api/v1/billing/services/{$service->id}", [
            'name' => 'Creator Cannot Edit',
            'category' => 'Custom',
            'price' => 600,
        ])->assertForbidden();

        $this->actingAs($editor)->putJson("/api/v1/billing/services/{$service->id}", [
            'name' => 'Edited Catalog Service',
            'category' => 'Custom',
            'price' => 600,
        ])->assertOk();
        $this->actingAs($editor)->deleteJson("/api/v1/billing/services/{$service->id}")->assertForbidden();

        $this->actingAs($deleter)->deleteJson("/api/v1/billing/services/{$service->id}")->assertOk();
        $this->assertDatabaseMissing('services', ['id' => $service->id]);
    }

    public function test_accounting_role_reaches_sales_refund_action_but_unrelated_role_is_denied(): void
    {
        $accounting = User::factory()->create(['role' => 'accounting_executive']);
        $unrelated = User::factory()->create(['role' => 'driver']);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-REFUND-ROUTE',
            'customer_name' => 'Refund Route Customer',
            'subtotal' => 100,
            'tax_amount' => 0,
            'total_amount' => 100,
            'amount_received' => 100,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'balance' => 0,
            'status' => 'paid',
            'created_by' => $accounting->id,
        ]);
        $order = SalesOrder::create([
            'order_number' => 'ORD-REFUND-ROUTE',
            'invoice_id' => $invoice->id,
            'status' => 'cancelled',
            'total_amount' => 100,
            'amount_paid' => 100,
            'balance' => 0,
        ]);
        $creditNote = CreditNote::create([
            'credit_note_number' => 'CN-REFUND-ROUTE',
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'status' => 'posted',
            'subtotal' => 100,
            'tax_amount' => 0,
            'total_amount' => 100,
            'reason' => 'Route authorization fixture',
        ]);
        $refund = SalesRefund::create([
            'refund_number' => 'REF-ROUTE-AUTH',
            'sales_order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'credit_note_id' => $creditNote->id,
            'status' => 'pending_approval',
            'amount' => 100,
            'refund_method' => 'Cash',
            'reason' => 'Route authorization fixture',
        ]);

        $this->actingAs($accounting)
            ->postJson("/api/v1/sales/refunds/{$refund->id}/approve")
            ->assertOk();

        $this->actingAs($unrelated)
            ->postJson("/api/v1/sales/refunds/{$refund->id}/approve")
            ->assertForbidden();
    }

    private function userWithAccountingPermissions(array $overrides): User
    {
        return User::factory()->create([
            'role' => 'driver',
            'custom_permissions' => [
                'accounting' => array_merge([
                    'can_view' => false,
                    'can_create' => false,
                    'can_edit' => false,
                    'can_delete' => false,
                ], $overrides),
            ],
        ]);
    }

    private function makeCollection(): Collection
    {
        return Collection::create([
            'client_name' => 'Route Authorization Client',
            'date' => now()->toDateString(),
            'travel_date' => now()->addWeek()->toDateString(),
            'rate' => 1000,
            'billing_amount' => 1000,
            'remaining_balance' => 1000,
            'paid_amount' => 0,
            'collection_status' => 'pending',
        ]);
    }

    private function paymentPayload(string $key = 'route-auth-payment'): array
    {
        return [
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount' => 100,
            'idempotency_key' => $key,
        ];
    }
}
