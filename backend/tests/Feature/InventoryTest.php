<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_agent_can_access_inventory_list()
    {
        $agent = User::factory()->superAdmin()->create();

        InventoryItem::factory()->count(3)->create();

        $response = $this->actingAs($agent, 'sanctum')->getJson('/api/v1/inventory');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         '*' => ['id', 'item_name', 'category', 'quantity']
                     ]
                 ]);
    }

    public function test_driver_cannot_access_inventory()
    {
        $driver = User::factory()->create(['role' => 'driver']);

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/v1/inventory');

        $response->assertStatus(403);
    }

    public function test_purchase_order_approval_adds_supplies_to_inventory()
    {
        $admin = User::factory()->superAdmin()->create();
        $supplier = \App\Models\Supplier::create([
            'company_name' => 'Test Supplier LLC',
            'accreditation_status' => 'accredited',
            'contact_person' => 'Supplier Contact',
            'email' => 'supplier@example.com',
            'phone' => '123456789',
        ]);

        $po = \App\Models\PurchaseOrder::create([
            'po_number' => 'PO-2026-9999',
            'supplier_id' => $supplier->id,
            'created_by' => $admin->id,
            'status' => 'pending_ceo_approval',
            'total_amount' => 5000.00,
        ]);

        $po->lineItems()->create([
            'item_name' => 'Brake Pad Set - Front',
            'quantity' => 10,
            'unit_price' => 500.00,
            'total_price' => 5000.00,
        ]);

        // Approve the PO
        $response = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/purchase-orders/{$po->id}/approve", [
            'approved' => true,
        ]);

        $response->assertStatus(200);

        // Verify inventory increased
        $this->assertDatabaseHas('inventory_items', [
            'item_name' => 'Brake Pad Set - Front',
            'quantity' => 10,
        ]);
    }

    public function test_work_order_completion_deducts_supplies_from_inventory()
    {
        $admin = User::factory()->superAdmin()->create();

        // Seed some inventory items
        $item = InventoryItem::create([
            'item_name' => 'Brake Pad Set - Front',
            'category' => 'Brakes',
            'quantity' => 15,
            'unit' => 'pcs',
            'reorder_level' => 5,
            'unit_cost' => 1250.00,
        ]);

        $bus = \App\Models\Bus::create([
            'plate_number' => 'NQR-4521',
            'model' => 'Golden Dragon',
            'seating_capacity' => 45,
            'status' => 'available',
        ]);

        $wo = \App\Models\WorkOrder::create([
            'wo_number' => 'WO-2026-9999',
            'bus_id' => $bus->id,
            'created_by' => $admin->id,
            'status' => 'open',
            'type' => 'maintenance',
            'priority' => 'urgent',
            'description' => 'Replace front brake pads',
            'parts_used' => 'Brake Pad Set - Front (2)',
            'cost' => 2500.00,
        ]);

        // Transition WO to in_progress first
        $wo->update(['status' => 'in_progress']);

        // Complete the WO
        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/work-orders/{$wo->id}", [
            'status' => 'completed',
        ]);

        $response->assertStatus(200);

        // Verify inventory decreased from 15 to 13
        $this->assertDatabaseHas('inventory_items', [
            'item_name' => 'Brake Pad Set - Front',
            'quantity' => 13,
        ]);

        $this->assertTrue($wo->fresh()->supplies_deducted);
    }
}
