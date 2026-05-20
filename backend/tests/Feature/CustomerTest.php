<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->agent = User::factory()->create(['role' => 'agent']);
    }

    public function test_agent_can_list_customers()
    {
        Customer::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.ph',
            'phone'      => '09171234567',
        ]);

        $this->actingAs($this->agent)
             ->getJson('/api/customers')
             ->assertOk()
             ->assertJsonPath('success', true);
    }

    public function test_agent_can_create_customer_with_valid_details()
    {
        $payload = [
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan.delacruz@example.ph',
            'phone'      => '+63 917 123 4567',
            'address'    => 'Manila, Philippines',
            'notes'      => 'Vip client',
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/customers', $payload)
             ->assertCreated()
             ->assertJsonPath('success', true)
             ->assertJsonPath('data.first_name', 'Juan')
             ->assertJsonPath('data.phone', '+63 917 123 4567');
    }

    public function test_customer_creation_fails_with_invalid_philippine_phone()
    {
        $payload = [
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.com',
            'phone'      => '1234567890', // Invalid, not PH standard
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/customers', $payload)
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['phone']);
    }

    public function test_customer_creation_fails_with_invalid_email()
    {
        $payload = [
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'not-an-email',
            'phone'      => '09171234567',
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/customers', $payload)
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['email']);
    }

    public function test_agent_can_update_customer_with_valid_details()
    {
        $customer = Customer::create([
            'first_name' => 'Original',
            'last_name'  => 'Name',
            'email'      => 'original@example.com',
            'phone'      => '09170000000',
        ]);

        $payload = [
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan.delacruz@example.ph',
            'phone'      => '0918-765-4321', // Valid local format
        ];

        $this->actingAs($this->agent)
             ->putJson("/api/customers/{$customer->id}", $payload)
             ->assertOk()
             ->assertJsonPath('success', true)
             ->assertJsonPath('data.phone', '0918-765-4321');
    }
}
