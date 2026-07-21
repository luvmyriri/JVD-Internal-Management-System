<?php

namespace Tests\Feature;

use App\Models\DocumentCategory;
use App\Models\ProcurementDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Characterization tests for the company-documents endpoints (roadmap 2.9 / 2.10).
 * Lock the read/create/delete contract so the controller -> ProcurementDocumentService
 * delegation cannot change behaviour.
 */
class ProcurementDocumentListTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_aggregates_and_prefixes_procurement_documents(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $doc = ProcurementDocument::create([
            'title'         => 'Supplier Receipt',
            'document_type' => 'receipt',
            'file_path'     => 'procurement/docs/x.pdf',
            'uploaded_by'   => $admin->id,
        ]);

        $res = $this->actingAs($admin)->getJson('/api/v1/procurement-documents')->assertOk();
        $res->assertJsonStructure(['success', 'data']);

        $ids = collect($res->json('data'))->pluck('id');
        $this->assertTrue($ids->contains("doc_procurement_{$doc->id}"));
    }

    public function test_store_creates_a_document_from_base64(): void
    {
        Storage::fake('public');
        $admin = User::factory()->superAdmin()->create();
        DocumentCategory::firstOrCreate(['slug' => 'receipt'], ['name' => 'Receipts']);

        $this->actingAs($admin)
            ->postJson('/api/v1/procurement-documents', [
                'title'         => 'Uploaded via base64',
                'document_type' => 'receipt',
                'file_base64'   => 'data:image/png;base64,dGVzdA==',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('procurement_documents', ['title' => 'Uploaded via base64']);
    }

    public function test_destroy_removes_a_procurement_document(): void
    {
        Storage::fake('public');
        $admin = User::factory()->superAdmin()->create();
        $doc = ProcurementDocument::create([
            'title'         => 'To Delete',
            'document_type' => 'receipt',
            'file_path'     => 'procurement/docs/y.pdf',
            'uploaded_by'   => $admin->id,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/procurement-documents/doc_procurement_{$doc->id}")
            ->assertOk();

        $this->assertDatabaseMissing('procurement_documents', ['id' => $doc->id]);
    }
}
