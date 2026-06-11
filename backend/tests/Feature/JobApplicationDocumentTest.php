<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\JobApplication;
use App\Models\JobApplicationDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class JobApplicationDocumentTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->agent = User::factory()->superAdmin()->create();
    }

    public function test_can_create_job_application_with_default_checklist()
    {
        $payload = [
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.com',
            'phone'      => '09171234567',
            'position_applied' => 'Software Engineer',
            'status'     => 'pending',
        ];

        $this->actingAs($this->agent)
             ->postJson('/api/job-applications', $payload)
             ->assertCreated()
             ->assertJsonPath('checklist.Resume/CV', false)
             ->assertJsonPath('checklist.Police Clearance/NBI', false);
    }

    public function test_can_update_job_application_checklist()
    {
        $app = JobApplication::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.com',
            'position_applied' => 'Software Engineer',
            'checklist'  => ['Resume/CV' => false],
        ]);

        $this->actingAs($this->agent)
             ->patchJson("/api/job-applications/{$app->id}/checklist", [
                 'checklist' => ['Resume/CV' => true, 'NBI' => false]
             ])
             ->assertOk()
             ->assertJsonPath('data.checklist.Resume/CV', true);
    }

    public function test_can_upload_document_and_sync_checklist()
    {
        Storage::fake('public');

        $app = JobApplication::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.com',
            'position_applied' => 'Software Engineer',
            'checklist'  => ['Resume/CV' => false, 'Police Clearance/NBI' => false],
        ]);

        $file = UploadedFile::fake()->create('resume.pdf', 500);

        $response = $this->actingAs($this->agent)
             ->postJson("/api/job-applications/{$app->id}/documents", [
                 'title' => 'Resume/CV',
                 'file'  => $file,
             ]);

        $response->assertCreated()
             ->assertJsonPath('success', true)
             ->assertJsonPath('data.title', 'Resume/CV');

        $document = JobApplicationDocument::first();
        $this->assertNotNull($document);
        $this->assertEquals('Resume/CV', $document->title);
        $this->assertEquals($app->id, $document->job_application_id);

        Storage::disk('public')->assertExists($document->file_path);

        $this->assertTrue($app->fresh()->checklist['Resume/CV']);
    }

    public function test_can_delete_document_and_unsync_checklist()
    {
        Storage::fake('public');

        $app = JobApplication::create([
            'first_name' => 'Juan',
            'last_name'  => 'dela Cruz',
            'email'      => 'juan@example.com',
            'position_applied' => 'Software Engineer',
            'checklist'  => ['Resume/CV' => true],
        ]);

        $filePath = 'job_applications/' . $app->id . '/testdoc.pdf';
        Storage::disk('public')->put($filePath, 'file content');

        $doc = JobApplicationDocument::create([
            'job_application_id' => $app->id,
            'title'            => 'Resume/CV',
            'file_path'        => $filePath,
            'uploaded_by'      => $this->agent->id,
        ]);

        $this->actingAs($this->agent)
             ->deleteJson("/api/job-applications/{$app->id}/documents/{$doc->id}")
             ->assertOk()
             ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('job_application_documents', [
            'id' => $doc->id,
        ]);

        Storage::disk('public')->assertMissing($filePath);

        $this->assertFalse($app->fresh()->checklist['Resume/CV']);
    }
}
