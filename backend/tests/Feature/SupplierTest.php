<?php

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierTest extends TestCase
{
    use RefreshDatabase;

    private User $accounting;
    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accounting = User::factory()->create(['role' => 'accounting']);
        $this->agent      = User::factory()->create(['role' => 'agent']);
    }

    public function test_accounting_can_list_suppliers()
    {
        Supplier::factory(5)->create();

        $this->actingAs($this->accounting)
             ->getJson('/api/suppliers')
             ->assertOk()
             ->assertJsonPath('success', true)
             ->assertJsonStructure(['data', 'meta']);
    }

    public function test_agent_cannot_access_suppliers()
    {
        $this->actingAs($this->agent)
             ->getJson('/api/suppliers')
             ->assertForbidden();
    }

    public function test_accounting_can_create_supplier()
    {
        $payload = [
            'company_name'   => 'Acme Parts Co.',
            'contact_person' => 'Ramon Reyes',
            'phone'          => '09171234567',
            'email'          => 'ramon@acme.com',
            'address'        => '123 EDSA, Pasay',
        ];

        $this->actingAs($this->accounting)
             ->postJson('/api/suppliers', $payload)
             ->assertCreated()
             ->assertJsonPath('data.company_name', 'Acme Parts Co.');
    }

    public function test_duplicate_company_name_is_rejected()
    {
        Supplier::factory()->create(['company_name' => 'Duplicate Corp']);

        $this->actingAs($this->accounting)
             ->postJson('/api/suppliers', ['company_name' => 'Duplicate Corp'])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['company_name']);
    }

    public function test_search_filter_returns_matching_suppliers()
    {
        Supplier::factory()->create(['company_name' => 'JVD Auto Parts']);
        Supplier::factory()->create(['company_name' => 'Manila Tires']);

        $this->actingAs($this->accounting)
             ->getJson('/api/suppliers?search=JVD')
             ->assertOk()
             ->assertJsonCount(1, 'data');
    }

    public function test_accounting_can_update_supplier()
    {
        $supplier = Supplier::factory()->create();

        $this->actingAs($this->accounting)
             ->putJson("/api/suppliers/{$supplier->id}", [
                 'contact_person' => 'Updated Person',
             ])
             ->assertOk()
             ->assertJsonPath('data.contact_person', 'Updated Person');
    }
}
