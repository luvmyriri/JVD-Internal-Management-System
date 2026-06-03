<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private User $accounting;
    private User $superAdmin;
    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->agent      = User::factory()->create(['role' => 'dispatcher']);
        $this->accounting = User::factory()->create(['role' => 'accounting_executive']);
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->supplier   = Supplier::factory()->create(['accreditation_status' => 'accredited']);
        $this->supplier->accreditations()->create([
            'accreditation_type' => 'internal_vendor',
            'issuing_body'       => 'JVD Management',
            'issue_date'         => now(),
            'expiry_date'        => now()->addYear(),
            'status'             => 'active',
        ]);
    }

    // ── Create ────────────────────────────────────────────

    public function test_agent_can_create_po_draft()
    {
        $res = $this->actingAs($this->agent)->postJson('/api/purchase-orders', [
            'supplier_id' => $this->supplier->id,
            'notes'       => 'Urgent spare parts',
            'items'       => [
                ['item_name' => 'Brake Pad', 'quantity' => 4, 'unit_price' => 1200],
                ['item_name' => 'Engine Oil', 'quantity' => 10, 'unit_price' => 350],
            ],
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonStructure(['data' => ['po_number', 'line_items']]);

        $this->assertDatabaseHas('purchase_orders', ['status' => 'draft', 'created_by' => $this->agent->id]);
    }

    public function test_po_number_follows_format()
    {
        $res = $this->actingAs($this->agent)->postJson('/api/purchase-orders', [
            'supplier_id' => $this->supplier->id,
            'items'       => [
                ['item_name' => 'Wiper Blade', 'quantity' => 2, 'unit_price' => 500],
            ],
        ]);

        $this->assertMatchesRegularExpression(
            '/^PO-\d{4}-\d{4}$/',
            $res->json('data.po_number')
        );
    }

    public function test_items_are_required()
    {
        $this->actingAs($this->agent)
             ->postJson('/api/purchase-orders', ['supplier_id' => $this->supplier->id])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['items']);
    }

    // ── Agent scoping ─────────────────────────────────────

    public function test_agent_only_sees_own_pos()
    {
        PurchaseOrder::factory()->create(['created_by' => $this->agent->id, 'supplier_id' => $this->supplier->id]);
        PurchaseOrder::factory(3)->create(['created_by' => $this->superAdmin->id, 'supplier_id' => $this->supplier->id]);

        $res = $this->actingAs($this->agent)->getJson('/api/purchase-orders');

        $res->assertOk();
        $this->assertCount(1, $res->json('data'));
    }

    public function test_admin_sees_all_pos()
    {
        PurchaseOrder::factory()->create(['created_by' => $this->agent->id, 'supplier_id' => $this->supplier->id]);
        PurchaseOrder::factory()->create(['created_by' => $this->superAdmin->id, 'supplier_id' => $this->supplier->id]);

        $this->actingAs($this->superAdmin)
             ->getJson('/api/purchase-orders')
             ->assertOk()
             ->assertJsonPath('meta.total', 2);
    }

    // ── Workflow ──────────────────────────────────────────

    public function test_agent_can_submit_draft()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'draft',
            'created_by'  => $this->agent->id,
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->agent)
             ->postJson("/api/purchase-orders/{$po->id}/submit")
             ->assertOk()
             ->assertJsonPath('data.status', 'pending_accounting_review');
    }

    public function test_cannot_submit_a_non_draft_po()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'pending_accounting_review',
            'created_by'  => $this->agent->id,
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->agent)
             ->postJson("/api/purchase-orders/{$po->id}/submit")
             ->assertUnprocessable();
    }

    public function test_accounting_can_verify_po()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'pending_accounting_review',
            'created_by'  => $this->agent->id,
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->accounting)
             ->postJson("/api/purchase-orders/{$po->id}/verify", ['approved' => true])
             ->assertOk()
             ->assertJsonPath('data.status', 'pending_ceo_approval');
    }

    public function test_agent_cannot_verify_po()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'pending_accounting_review',
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->agent)
             ->postJson("/api/purchase-orders/{$po->id}/verify", ['approved' => true])
             ->assertForbidden();
    }

    public function test_super_admin_can_approve_po()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'pending_ceo_approval',
            'created_by'  => $this->agent->id,
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->superAdmin)
             ->postJson("/api/purchase-orders/{$po->id}/approve", ['approved' => true])
             ->assertOk()
             ->assertJsonPath('data.status', 'approved');
    }

    public function test_accounting_cannot_approve_po()
    {
        $po = PurchaseOrder::factory()->create([
            'status'      => 'pending_ceo_approval',
            'supplier_id' => $this->supplier->id,
        ]);

        $this->actingAs($this->accounting)
             ->postJson("/api/purchase-orders/{$po->id}/approve", ['approved' => true])
             ->assertForbidden();
    }
}
