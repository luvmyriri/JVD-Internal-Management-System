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
        $agent = User::factory()->create(['role' => 'agent']);

        InventoryItem::factory()->count(3)->create();

        $response = $this->actingAs($agent, 'sanctum')->getJson('/api/inventory');

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

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/inventory');

        $response->assertStatus(403);
    }
}
