<?php

namespace Tests\Feature;

use App\Mail\TransactionNotificationMail;
use App\Models\Invoice;
use App\Models\JoinerDeparture;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SentryIssueRegressionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);
    }

    public function test_landing_page_settings_handles_both_json_and_array_documents_without_type_error(): void
    {
        $documentsArray = [
            ['title' => 'Terms of Service', 'description' => 'Standard terms', 'url' => '/terms.pdf'],
        ];

        // 1. Submit as array
        $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/settings/landing-page', [
            'existing_documents' => $documentsArray,
            'landing_page_title' => 'Updated JVD Title',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.landing_page_title', 'Updated JVD Title')
            ->assertJsonPath('data.landing_page_documents.0.title', 'Terms of Service');

        // 2. Submit as JSON string
        $responseJson = $this->actingAs($this->admin)->postJson('/api/v1/admin/settings/landing-page', [
            'existing_documents' => json_encode($documentsArray),
            'landing_page_title' => 'JVD ETMC New',
        ]);

        $responseJson->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.landing_page_title', 'JVD ETMC New')
            ->assertJsonPath('data.landing_page_documents.0.title', 'Terms of Service');
    }

    public function test_joiner_departure_creation_rejects_duplicate_code_with_422(): void
    {
        $service = Service::create([
            'name' => 'Sagada Joiner Tour',
            'price' => 3500,
            'service_type' => 'joiner_tour',
            'is_active' => true,
            'category' => 'tour',
            'created_by' => $this->admin->id,
        ]);

        JoinerDeparture::create([
            'service_id' => $service->id,
            'code' => 'LT-2026-09-17',
            'starts_at' => now()->addDays(10),
            'ends_at' => now()->addDays(11),
            'booking_cutoff_at' => now()->addDays(8),
            'capacity' => 20,
            'created_by' => $this->admin->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/sales/joiner-departures', [
            'service_id' => $service->id,
            'code' => 'LT-2026-09-17',
            'starts_at' => now()->addDays(20)->toISOString(),
            'ends_at' => now()->addDays(21)->toISOString(),
            'booking_cutoff_at' => now()->addDays(18)->toISOString(),
            'capacity' => 20,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }

    public function test_deleting_service_with_dependencies_deactivates_gracefully(): void
    {
        $service = Service::create([
            'name' => 'Baguio Joiner Tour',
            'price' => 3000,
            'service_type' => 'joiner_tour',
            'is_active' => true,
            'category' => 'tour',
            'created_by' => $this->admin->id,
        ]);

        JoinerDeparture::create([
            'service_id' => $service->id,
            'code' => 'JNR-DEP-TEST-01',
            'starts_at' => now()->addDays(10),
            'ends_at' => now()->addDays(11),
            'booking_cutoff_at' => now()->addDays(8),
            'capacity' => 20,
            'created_by' => $this->admin->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/v1/billing/services/{$service->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('deactivated', true);

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'is_active' => false,
        ]);
    }

    public function test_email_mailables_render_without_textpart_array_offset_on_null_error(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-001',
            'customer_name' => 'John Doe',
            'customer_email' => 'johndoe@example.com',
            'payment_method' => 'Cash',
            'subtotal' => 5000,
            'tax_amount' => 600,
            'total_amount' => 5600,
            'status' => 'paid',
            'created_by' => $this->admin->id,
        ]);

        $mail = new TransactionNotificationMail($invoice);
        $rendered = $mail->render();
        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('INV-TEST-001', $rendered);
    }
}
