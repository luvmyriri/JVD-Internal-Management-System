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
use Tests\TestCase;

class PassportCaseTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->agent = User::factory()->superAdmin()->create();
    }

    public function test_can_create_passport_case_with_existing_customer_and_passenger()
    {
        $customer = Customer::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
        ]);

        $passenger = Passenger::create([
            'customer_id' => $customer->id,
            'first_name'  => 'Juan',
            'last_name'   => 'dela Cruz',
        ]);

        $payload = [
            'customer_id'  => $customer->id,
            'passenger_id' => $passenger->id,
            'case_type'    => 'visa',
            'destination_country' => 'JP',
            'visa_type'    => 'Tourist',
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/passport-cases', $payload)
             ->assertCreated()
             ->assertJsonPath('success', true)
             ->assertJsonPath('data.customer.id', $customer->id)
             ->assertJsonPath('data.passenger.id', $passenger->id);
    }

    public function test_can_create_passport_case_with_fillable_customer_details()
    {
        $payload = [
            'first_name'   => 'Maria',
            'middle_name'  => 'Santos',
            'last_name'    => 'Reyes',
            'suffix'       => 'Jr.',
            'case_type'    => 'visa',
            'destination_country' => 'KR',
            'visa_type'    => 'Tourist',
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/passport-cases', $payload)
             ->assertCreated()
             ->assertJsonPath('success', true);

        // Verify Customer and Passenger were created in DB
        $this->assertDatabaseHas('customers', [
            'first_name'  => 'Maria',
            'middle_name' => 'Santos',
            'last_name'   => 'Reyes',
            'suffix'      => 'Jr.',
        ]);

        $customer = Customer::where('first_name', 'Maria')->first();
        $this->assertNotNull($customer);

        $this->assertDatabaseHas('passengers', [
            'customer_id' => $customer->id,
            'first_name'  => 'Maria',
            'middle_name' => 'Santos',
            'last_name'   => 'Reyes',
            'suffix'      => 'Jr.',
        ]);
    }

    public function test_can_upload_document_to_passport_case()
    {
        Storage::fake('public');

        $customer = Customer::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
        ]);

        $passenger = Passenger::create([
            'customer_id' => $customer->id,
            'first_name'  => 'Juan',
            'last_name'   => 'dela Cruz',
        ]);

        $case = PassportCase::create([
            'customer_id'  => $customer->id,
            'passenger_id' => $passenger->id,
            'case_type'    => 'passport',
            'handled_by'   => $this->agent->id,
            'status'       => 'requirements_gathering',
            'checklist'    => [],
        ]);

        $file = UploadedFile::fake()->create('passport_scan.pdf', 500);

        $response = $this->actingAs($this->agent)
             ->postJson("/api/passport-cases/{$case->id}/documents", [
                 'title' => 'My Passport Scan',
                 'file'  => $file,
             ]);

        $response->assertCreated()
             ->assertJsonPath('success', true)
             ->assertJsonPath('data.title', 'My Passport Scan');

        $document = PassportCaseDocument::first();
        $this->assertNotNull($document);
        $this->assertEquals('My Passport Scan', $document->title);
        $this->assertEquals($case->id, $document->passport_case_id);
        $this->assertEquals($customer->id, $document->customer_id);

        Storage::disk('public')->assertExists($document->file_path);
    }

    public function test_can_list_documents_of_a_passport_case()
    {
        $customer = Customer::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
        ]);

        $passenger = Passenger::create([
            'customer_id' => $customer->id,
            'first_name'  => 'Juan',
            'last_name'   => 'dela Cruz',
        ]);

        $case = PassportCase::create([
            'customer_id'  => $customer->id,
            'passenger_id' => $passenger->id,
            'case_type'    => 'passport',
            'handled_by'   => $this->agent->id,
            'status'       => 'requirements_gathering',
            'checklist'    => [],
        ]);

        $doc = PassportCaseDocument::create([
            'passport_case_id' => $case->id,
            'customer_id'      => $customer->id,
            'title'            => 'PSA Birth Cert',
            'file_path'        => 'passport_cases/1/abc.pdf',
            'uploaded_by'      => $this->agent->id,
        ]);

        $this->actingAs($this->agent)
             ->getJson("/api/passport-cases/{$case->id}/documents")
             ->assertOk()
             ->assertJsonPath('success', true)
             ->assertJsonCount(1, 'data')
             ->assertJsonPath('data.0.title', 'PSA Birth Cert');
    }

    public function test_can_delete_document_from_passport_case()
    {
        Storage::fake('public');

        $customer = Customer::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
        ]);

        $passenger = Passenger::create([
            'customer_id' => $customer->id,
            'first_name'  => 'Juan',
            'last_name'   => 'dela Cruz',
        ]);

        $case = PassportCase::create([
            'customer_id'  => $customer->id,
            'passenger_id' => $passenger->id,
            'case_type'    => 'passport',
            'handled_by'   => $this->agent->id,
            'status'       => 'requirements_gathering',
            'checklist'    => [],
        ]);

        $filePath = 'passport_cases/' . $case->id . '/testdoc.pdf';
        Storage::disk('public')->put($filePath, 'file content');

        $doc = PassportCaseDocument::create([
            'passport_case_id' => $case->id,
            'customer_id'      => $customer->id,
            'title'            => 'PSA Birth Cert',
            'file_path'        => $filePath,
            'uploaded_by'      => $this->agent->id,
        ]);

        $this->actingAs($this->agent)
             ->deleteJson("/api/passport-cases/{$case->id}/documents/{$doc->id}")
             ->assertOk()
             ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('passport_case_documents', [
            'id' => $doc->id,
        ]);

        Storage::disk('public')->assertMissing($filePath);
    }
}
