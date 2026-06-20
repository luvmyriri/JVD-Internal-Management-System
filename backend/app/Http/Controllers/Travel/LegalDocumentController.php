<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LegalDocumentController extends Controller
{
    /**
     * List all documents, optionally filtered by job_order_id or document_type.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LegalDocument::with(['jobOrder', 'uploader'])
            ->orderByDesc('created_at');

        if ($request->filled('job_order_id')) {
            $query->where('job_order_id', $request->job_order_id);
        }

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        $documents = $query->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => $documents->items(),
            'meta'    => [
                'current_page' => $documents->currentPage(),
                'last_page'    => $documents->lastPage(),
                'per_page'     => $documents->perPage(),
                'total'        => $documents->total(),
            ],
        ]);
    }

    /**
     * Upload a document.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'job_order_id'  => 'nullable|exists:job_orders,id',
            'title'         => 'required|string|max:255',
            'document_type' => 'required|string|max:100',
            // C-02: restrict to safe document/image types — never store client-supplied executables.
            'file'          => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', // 20MB
            'notes'         => 'nullable|string|max:1000',
        ]);

        $path = $request->file('file')->store('legal_documents', 'public');

        $doc = LegalDocument::create([
            'job_order_id'  => $request->job_order_id,
            'title'         => $request->title,
            'document_type' => $request->document_type,
            'file_path'     => Storage::url($path),
            'uploaded_by'   => $request->user()->id,
            'notes'         => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $doc->load(['jobOrder', 'uploader']),
            'message' => 'Document uploaded successfully.',
        ], 201);
    }

    /**
     * Delete a document.
     */
    public function destroy(LegalDocument $legalDocument): JsonResponse
    {
        // H-02: remove the physical file from disk before deleting the record to avoid orphaned files.
        if ($legalDocument->file_path) {
            $relativePath = str_replace('/storage/', '', $legalDocument->file_path);
            if (Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }
        }

        $legalDocument->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document removed.',
        ]);
    }
}
