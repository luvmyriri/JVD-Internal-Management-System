<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Passenger;
use App\Models\PassportCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TravelCaseBillingSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->agent = User::factory()->superAdmin()->create();
    }

    public function test_releasing_a_travel_case_does_not_create_an_invoice(): void
    {
        $customer = $this->customer('Release', 'Customer');
        $case = $this->passportCase($customer, 'visa', 'ready_for_release');

        $this->actingAs($this->agent)
            ->patchJson("/api/v1/passport-cases/{$case->id}/status", ['status' => 'released'])
            ->assertOk()
            ->assertJsonPath('data.status', 'released');

        $this->assertSame(0, Invoice::count());
        $this->assertSame('released', $case->fresh()->status);
    }

    public function test_direct_checkout_rejects_a_case_owned_by_another_customer(): void
    {
        $owner = $this->customer('Case', 'Owner');
        $other = $this->customer('Invoice', 'Customer');
        $case = $this->passportCase($owner);

        $this->actingAs($this->agent)
            ->postJson('/api/v1/billing', $this->checkoutPayload($other, [
                $this->caseLine($case, 'Visa assistance'),
            ]))
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.items.0',
                'The selected passport or visa case belongs to a different customer.'
            );

        $this->assertSame(0, Invoice::count());
    }

    public function test_contract_draft_supports_multiple_case_lines_and_prevents_rebilling(): void
    {
        $customer = $this->customer('Multi', 'Applicant');
        $visaCase = $this->passportCase($customer, 'visa');
        $passportCase = $this->passportCase($customer, 'passport');

        $payload = $this->checkoutPayload($customer, [
            $this->caseLine($visaCase, 'Visa assistance'),
            $this->caseLine($passportCase, 'Passport assistance'),
        ]);

        $this->actingAs($this->agent)
            ->postJson('/api/v1/contracts/draft', $payload)
            ->assertCreated();

        $invoice = Invoice::latest('id')->firstOrFail();
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'passport_case_id' => $visaCase->id,
        ]);
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'passport_case_id' => $passportCase->id,
        ]);

        $cases = $this->actingAs($this->agent)
            ->getJson("/api/v1/passport-cases?customer_id={$customer->id}")
            ->assertOk()
            ->json('data');

        $byId = collect($cases)->keyBy('id');
        $this->assertTrue($byId[$visaCase->id]['is_billed']);
        $this->assertSame($invoice->id, $byId[$visaCase->id]['billed_invoice_id']);
        $this->assertTrue($byId[$passportCase->id]['is_billed']);
        $this->assertSame($invoice->id, $byId[$passportCase->id]['billed_invoice_id']);

        $this->actingAs($this->agent)
            ->postJson('/api/v1/billing', $this->checkoutPayload($customer, [
                $this->caseLine($visaCase, 'Duplicate visa assistance'),
            ]))
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.items.0',
                'The selected passport or visa case is already billed on another transaction.'
            );

        $this->assertSame(1, Invoice::count());
    }

    public function test_contract_signature_revalidates_case_customer_ownership(): void
    {
        $customer = $this->customer('Draft', 'Customer');
        $differentCustomer = $this->customer('Changed', 'Owner');
        $case = $this->passportCase($customer);

        $this->actingAs($this->agent)
            ->postJson('/api/v1/contracts/draft', $this->checkoutPayload($customer, [
                $this->caseLine($case, 'Visa assistance'),
            ]))
            ->assertCreated();

        $contract = Contract::latest('id')->firstOrFail();
        $case->update(['customer_id' => $differentCustomer->id]);

        $this->actingAs($this->agent)
            ->postJson("/api/v1/contracts/{$contract->id}/sign", [
                'signature_image' => 'data:image/png;base64,dGVzdA==',
                'signature_typed_name' => 'Draft Customer',
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.items.0',
                'The selected passport or visa case belongs to a different customer.'
            );

        $this->assertSame('draft', $contract->fresh()->status);
        $this->assertSame('draft_pending_contract', $contract->invoice->fresh()->status);
    }

    private function customer(string $firstName, string $lastName): Customer
    {
        return Customer::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
        ]);
    }

    private function passportCase(
        Customer $customer,
        string $caseType = 'visa',
        string $status = 'requirements_gathering'
    ): PassportCase {
        $passenger = Passenger::create([
            'customer_id' => $customer->id,
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
        ]);

        return PassportCase::create([
            'customer_id' => $customer->id,
            'passenger_id' => $passenger->id,
            'handled_by' => $this->agent->id,
            'case_type' => $caseType,
            'status' => $status,
            'checklist' => [],
        ]);
    }

    /** @return array<string, mixed> */
    private function checkoutPayload(Customer $customer, array $items): array
    {
        return [
            'customer_id' => $customer->id,
            'customer_name' => trim("{$customer->first_name} {$customer->last_name}"),
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'amount_received' => 5000,
            'tax_rate' => 0,
            'items' => $items,
            'custom_transaction_detail' => [
                'category' => 'Travel Assistance',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function caseLine(PassportCase $case, string $name): array
    {
        return [
            'passport_case_id' => $case->id,
            'item_name' => $name,
            'service_type' => $case->case_type === 'visa' ? 'visa_assistance' : 'passport_assistance',
            'quantity' => 1,
            'unit_price' => 1000,
        ];
    }
}
