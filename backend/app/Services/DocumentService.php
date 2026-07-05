<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    /**
     * Upload a new document and attach it to an array of linkables.
     */
    public function uploadDocument(
        UploadedFile $file,
        string $title,
        ?int $categoryId = null,
        array $tags = [],
        array $linkables = [],
        array $meta = []
    ): Document {
        $path = $file->store('documents', 'public');

        $docNumber = 'JVD-DOC-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);

        $document = Document::create([
            'doc_number' => $docNumber,
            'title' => $title,
            'category_id' => $categoryId,
            'tags' => $tags,
            'storage_type' => $meta['storage_type'] ?? 'soft',
            'file_path' => $path,
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'checksum' => md5_file($file->getRealPath()),
            'physical_location' => $meta['physical_location'] ?? null,
            'issue_date' => $meta['issue_date'] ?? null,
            'expiry_date' => $meta['expiry_date'] ?? null,
            'retention_until' => $meta['retention_until'] ?? null,
            'source' => $meta['source'] ?? 'uploaded',
            'uploaded_by' => auth()->id(),
        ]);

        $document->versions()->create([
            'version' => 1,
            'file_path' => $path,
            'uploaded_by' => auth()->id(),
        ]);

        foreach ($linkables as $linkable) {
            // Assuming $linkable has the HasDocuments trait
            if (method_exists($linkable, 'documents')) {
                $linkable->documents()->attach($document->id);
            }
        }

        return $document;
    }

    /**
     * Upload a new version of an existing document.
     */
    public function uploadVersion(Document $document, UploadedFile $file): Document
    {
        $path = $file->store('documents', 'public');
        
        $latestVersion = $document->versions()->max('version') ?? 0;

        $document->update([
            'file_path' => $path,
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'checksum' => md5_file($file->getRealPath()),
        ]);

        $document->versions()->create([
            'version' => $latestVersion + 1,
            'file_path' => $path,
            'uploaded_by' => auth()->id(),
        ]);

        return $document;
    }
}
