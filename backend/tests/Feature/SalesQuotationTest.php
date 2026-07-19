<?php

namespace Tests\Feature;

use App\Models\SalesQuotation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesQuotationTest extends TestCase
{
    use RefreshDatabase;

    private function salesUser(): User
    {
        return User::factory()->create(['role' => 'reservation_officer']);
    }

    private function payload(): array
    {
        return [
            'client_name' => 'Acme Corp',
            'client_company' => 'Acme Inc.',
            'service_name' => 'Baguio Tour',
            'category' => 'Tour',
            'line_items' => [
                ['description' => 'Vehicle Rental (Bus)', 'unit_price' => 100000, 'quantity' => 1],
                ['description' => 'Extra Rental Hours', 'unit_price' => 1000, 'quantity' => 12],
            ],
            'valid_days' => 15,
        ];
    }

    public function test_sales_user_creates_a_quotation_with_sequential_number_and_vat_breakdown(): void
    {
        $res = $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $this->payload())
            ->assertStatus(201);

        // Total = 100000 + 12000 = 112000 (VAT-inclusive). Decomposed: subtotal 100000, VAT 12000.
        $res->assertJsonPath('data.total', 112000);
        $res->assertJsonPath('data.subtotal', 100000);
        $res->assertJsonPath('data.vat_amount', 12000);

        $year = date('Y');
        $res->assertJsonPath('data.quotation_number', "JVD-QT-{$year}-000001");

        $this->assertDatabaseHas('sales_quotations', [
            'quotation_number' => "JVD-QT-{$year}-000001",
            'client_name' => 'Acme Corp',
        ]);
    }

    public function test_quotation_numbers_increment(): void
    {
        $user = $this->salesUser();
        $year = date('Y');

        $this->actingAs($user)->postJson('/api/v1/sales/quotations', $this->payload())
            ->assertJsonPath('data.quotation_number', "JVD-QT-{$year}-000001");
        $this->actingAs($user)->postJson('/api/v1/sales/quotations', $this->payload())
            ->assertJsonPath('data.quotation_number', "JVD-QT-{$year}-000002");

        $this->assertDatabaseCount('sales_quotations', 2);
    }

    public function test_non_sales_role_cannot_create_quotations(): void
    {
        $driver = User::factory()->create(['role' => 'driver']);
        $this->actingAs($driver)
            ->postJson('/api/v1/sales/quotations', $this->payload())
            ->assertStatus(403);

        $this->assertDatabaseCount('sales_quotations', 0);
    }

    public function test_client_name_is_required(): void
    {
        $payload = $this->payload();
        unset($payload['client_name']);
        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertStatus(422);
    }
}
