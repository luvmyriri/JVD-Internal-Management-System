<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Passenger;
use App\Models\User;
use App\Models\PassportCase;
use App\Models\PassportCaseDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use App\Mail\VisaDocumentRequestMail;
use Tests\TestCase;

class VisaPublicUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private Customer $customer;
    private Passenger $passenger;
    private PassportCase $visaCase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->agent = User::factory()->superAdmin()->create();

        $this->customer = Customer::create([
            'first_name' => 'John',
            'last_name'  => 'Doe',
            'email'      => 'john@example.com',
        ]);

        $this->passenger = Passenger::create([
            'customer_id' => $this->customer->id,
            'first_name'  => 'John',
            'last_name'   => 'Doe',
        ]);

        $this->visaCase = PassportCase::create([
            'customer_id'         => $this->customer->id,
            'passenger_id'        => $this->passenger->id,
            'case_type'           => 'visa',
            'destination_country' => 'JP',
            'visa_type'           => 'Tourist',
            'handled_by'          => $this->agent->id,
            'status'              => 'requirements_gathering',
            'checklist'           => [
                'Valid Passport'        => false,
                'Visa Application Form' => false,
                'Bank Statement'        => false,
            ],
        ]);
    }

    public function test_agent_can_request_documents_and_send_email()
    {
        Mail::fake();

        $payload = [
            'requested_docs' => ['Valid Passport', 'Bank Statement'],
        ];

        $response = $this->actingAs($this->agent)
            ->postJson("/api/passport-cases/{$this->visaCase->id}/request-documents", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Verify token & requested docs are saved in database
        $this->visaCase->refresh();
        $this->assertNotNull($this->visaCase->upload_token);
        $this->assertEquals(['Valid Passport', 'Bank Statement'], $this->visaCase->upload_requested_docs);
        $this->assertNotNull($this->visaCase->upload_email_sent_at);

        // Assert mail was sent to customer
        Mail::assertSent(VisaDocumentRequestMail::class, function ($mail) {
            return $mail->hasTo($this->customer->email) &&
                   $mail->passportCase->id === $this->visaCase->id &&
                   $mail->requestedDocs === ['Valid Passport', 'Bank Statement'];
        });
    }

    public function test_cannot_request_documents_if_customer_has_no_email()
    {
        $customerNoEmail = Customer::create([
            'first_name' => 'No',
            'last_name'  => 'Email',
        ]);

        $caseNoEmail = PassportCase::create([
            'customer_id'         => $customerNoEmail->id,
            'passenger_id'        => $this->passenger->id,
            'case_type'           => 'visa',
            'handled_by'          => $this->agent->id,
            'status'              => 'requirements_gathering',
        ]);

        $response = $this->actingAs($this->agent)
            ->postJson("/api/passport-cases/{$caseNoEmail->id}/request-documents", [
                'requested_docs' => ['Valid Passport'],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Customer must have an email address to request documents online.');
    }

    public function test_guest_can_verify_upload_token()
    {
        $this->visaCase->update([
            'upload_token'          => 'test-token-123',
            'upload_requested_docs' => ['Valid Passport', 'Bank Statement'],
        ]);

        $response = $this->getJson('/api/public/visa-requests/test-token-123');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer_name', 'John Doe')
            ->assertJsonPath('data.passenger_name', 'John Doe')
            ->assertJsonPath('data.destination_country', 'JP')
            ->assertJsonPath('data.visa_type', 'Tourist')
            ->assertJsonPath('data.requested_docs', ['Valid Passport', 'Bank Statement']);
    }

    public function test_guest_cannot_verify_invalid_token()
    {
        $response = $this->getJson('/api/public/visa-requests/non-existent-token');

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Forbidden: Invalid or expired upload token.');
    }

    public function test_guest_can_upload_document_using_token()
    {
        Storage::fake('public');

        $this->visaCase->update([
            'upload_token'          => 'test-token-123',
            'upload_requested_docs' => ['Valid Passport', 'Bank Statement'],
        ]);

        $file = UploadedFile::fake()->create('passport.pdf', 500);

        $response = $this->postJson('/api/public/visa-requests/test-token-123/upload', [
            'title' => 'Valid Passport',
            'file'  => $file,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        // Verify document was stored & created in database
        $document = PassportCaseDocument::first();
        $this->assertNotNull($document);
        $this->assertEquals($this->visaCase->id, $document->passport_case_id);
        $this->assertEquals('Valid Passport', $document->title);
        $this->assertNull($document->uploaded_by); // Guest upload

        Storage::disk('public')->assertExists($document->file_path);

        // Verify checklist item is completed
        $this->visaCase->refresh();
        $this->assertTrue($this->visaCase->checklist['Valid Passport']);
    }

    public function test_cannot_upload_non_requested_document()
    {
        $this->visaCase->update([
            'upload_token'          => 'test-token-123',
            'upload_requested_docs' => ['Valid Passport'],
        ]);

        $file = UploadedFile::fake()->create('unrequested.pdf', 500);

        $response = $this->postJson('/api/public/visa-requests/test-token-123/upload', [
            'title' => 'Bank Statement', // Not in requested_docs
            'file'  => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Document title is not requested for online upload.');
    }
}
