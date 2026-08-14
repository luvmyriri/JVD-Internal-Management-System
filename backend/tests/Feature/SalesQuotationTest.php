<?php

namespace Tests\Feature;

use App\Models\SalesQuotation;
use App\Models\Service;
use App\Models\SystemSetting;
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

        // Catalog/bespoke line rates are VAT-exclusive, matching invoicing.
        $res->assertJsonPath('data.subtotal', 112000);
        $res->assertJsonPath('data.vat_amount', 13440);
        $res->assertJsonPath('data.total', 125440);

        $year = date('Y');
        $res->assertJsonPath('data.quotation_number', "JVD-QT-{$year}-000001");

        $this->assertDatabaseHas('sales_quotations', [
            'quotation_number' => "JVD-QT-{$year}-000001",
            'client_name' => 'Acme Corp',
        ]);
    }

    public function test_catalog_service_price_tampering_does_not_change_the_quotation_total(): void
    {
        $service = Service::create([
            'name' => 'Catalog Tour',
            'category' => 'Tour',
            'price' => 5600,
            'adult_price' => 7000,
            'child_price' => 4000,
            'is_active' => true,
        ]);

        $payload = $this->payload();
        $payload['service_id'] = $service->id;
        $payload['line_items'] = [[
            'description' => 'Catalog Tour',
            'unit_price' => 0.01,
            'quantity' => 2,
        ]];

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.line_items.0.service_id', $service->id)
            ->assertJsonPath('data.line_items.0.unit_price', 5600)
            ->assertJsonPath('data.line_items.0.quantity', 1)
            ->assertJsonPath('data.line_items.0.amount', 5600)
            ->assertJsonPath('data.subtotal', 5600)
            ->assertJsonPath('data.total', 6272);

        $quotation = SalesQuotation::firstOrFail();
        $this->assertSame(5600.0, (float) $quotation->line_items[0]['unit_price']);
        $this->assertSame(6272.0, (float) $quotation->total);
    }

    public function test_per_line_catalog_service_is_server_priced_when_no_top_level_service_is_supplied(): void
    {
        $service = Service::create([
            'name' => 'Airport Transfer',
            'category' => 'Transport',
            'price' => 1200,
            'is_active' => true,
        ]);

        $payload = $this->payload();
        unset($payload['service_id']);
        $payload['line_items'] = [[
            'service_id' => $service->id,
            'description' => 'Airport Transfer',
            'unit_price' => 1,
            'quantity' => 2,
        ]];

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.service_id', null)
            ->assertJsonPath('data.line_items.0.service_id', $service->id)
            ->assertJsonPath('data.line_items.0.unit_price', 1200)
            ->assertJsonPath('data.subtotal', 2400)
            ->assertJsonPath('data.total', 2688);
    }

    public function test_conflicting_top_level_and_line_service_ids_are_rejected(): void
    {
        $quotationService = Service::create([
            'name' => 'Tour A',
            'category' => 'Tour',
            'price' => 1000,
            'is_active' => true,
        ]);
        $differentService = Service::create([
            'name' => 'Tour B',
            'category' => 'Tour',
            'price' => 2000,
            'is_active' => true,
        ]);

        $payload = $this->payload();
        $payload['service_id'] = $quotationService->id;
        $payload['line_items'][0]['service_id'] = $differentService->id;

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['line_items.0.service_id']);

        $this->assertDatabaseCount('sales_quotations', 0);
    }

    public function test_unknown_per_line_service_id_is_rejected(): void
    {
        $payload = $this->payload();
        $payload['line_items'][0]['service_id'] = 999999999;

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['line_items.0.service_id']);

        $this->assertDatabaseCount('sales_quotations', 0);
    }

    public function test_bespoke_line_keeps_the_staff_entered_unit_price(): void
    {
        $payload = $this->payload();
        $payload['service_id'] = null;
        $payload['line_items'] = [[
            'service_id' => null,
            'description' => 'Bespoke itinerary planning',
            'unit_price' => 7700,
            'quantity' => 2,
        ]];

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.line_items.0.service_id', null)
            ->assertJsonPath('data.line_items.0.unit_price', 7700)
            ->assertJsonPath('data.subtotal', 15400)
            ->assertJsonPath('data.total', 17248);
    }

    public function test_vat_breakdown_uses_the_configured_system_rate(): void
    {
        SystemSetting::setValue('vat_rate', 0.10);

        $payload = $this->payload();
        $payload['line_items'] = [[
            'description' => 'VAT-exclusive bespoke service',
            'unit_price' => 110,
            'quantity' => 1,
        ]];

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 110)
            ->assertJsonPath('data.vat_amount', 11)
            ->assertJsonPath('data.total', 121)
            ->assertJsonPath('data.vat_rate', 10);
    }

    public function test_tour_quotation_rebuilds_vehicle_and_extension_lines_from_server_catalog_rates(): void
    {
        $service = Service::create([
            'name' => 'Server-priced Tour',
            'category' => 'Tours',
            'price' => 1,
            'bus_price' => 50000,
            'coaster_price' => 35000,
            'is_tour' => true,
            'is_active' => true,
        ]);

        $payload = [
            'client_name' => 'Tour Customer',
            'service_id' => $service->id,
            // Client-supplied rows must not influence a selected tour package.
            'line_items' => [[
                'description' => 'Tampered vehicle line',
                'unit_price' => 0.01,
                'quantity' => 999,
            ]],
            'pricing_context' => [
                'vehicle' => 'bus',
                'extra_days' => 1,
                'extra_hours' => 2,
            ],
        ];

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.line_items.0.description', 'Vehicle Rental (Bus)')
            ->assertJsonPath('data.line_items.0.unit_price', 50000)
            ->assertJsonPath('data.line_items.1.description', 'Extra Rental Days')
            ->assertJsonPath('data.line_items.1.unit_price', 22010)
            ->assertJsonPath('data.line_items.2.description', 'Extra Rental Hours')
            ->assertJsonPath('data.line_items.2.unit_price', 1950)
            ->assertJsonPath('data.subtotal', 75910)
            ->assertJsonPath('data.vat_amount', 9109.2)
            ->assertJsonPath('data.total', 85019.2);
    }

    public function test_guest_package_quotation_rebuilds_adult_and_child_lines_from_server_catalog_rates(): void
    {
        $service = Service::create([
            'name' => 'Server-priced Guest Package',
            'category' => 'Packages',
            'price' => 999,
            'adult_price' => 3000,
            'child_price' => 1500,
            'child_discount' => 50,
            'has_booking_fields' => true,
            'is_active' => true,
        ]);

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', [
                'client_name' => 'Family Customer',
                'service_id' => $service->id,
                'line_items' => [[
                    'description' => 'Tampered tickets',
                    'unit_price' => 0.01,
                    'quantity' => 999,
                ]],
                'pricing_context' => ['adults' => 2, 'children' => 3],
            ])
            ->assertCreated()
            ->assertJsonPath('data.line_items.0.description', 'Adult Guest Tickets')
            ->assertJsonPath('data.line_items.0.unit_price', 3000)
            ->assertJsonPath('data.line_items.0.quantity', 2)
            ->assertJsonPath('data.line_items.1.description', 'Child Guest Tickets (50% off)')
            ->assertJsonPath('data.line_items.1.unit_price', 1500)
            ->assertJsonPath('data.line_items.1.quantity', 3)
            ->assertJsonPath('data.subtotal', 10500)
            ->assertJsonPath('data.total', 11760);
    }

    public function test_specialized_catalog_package_requires_non_price_booking_context(): void
    {
        $service = Service::create([
            'name' => 'Context Required Tour',
            'category' => 'Tours',
            'price' => 1,
            'bus_price' => 50000,
            'coaster_price' => 35000,
            'is_tour' => true,
            'is_active' => true,
        ]);

        $this->actingAs($this->salesUser())
            ->postJson('/api/v1/sales/quotations', [
                'client_name' => 'Context Customer',
                'service_id' => $service->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'pricing_context.vehicle',
                'pricing_context.extra_days',
                'pricing_context.extra_hours',
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
