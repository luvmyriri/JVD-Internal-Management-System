<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Models\ProcurementDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProcurementDocumentController extends Controller
{
    /**
     * Display a listing of the documents with smart filters and eager-loaded links.
     */
    public function index(Request $request)
    {
        $query = ProcurementDocument::with(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email', 'uploader:id,first_name,last_name,email']);

        // Smart Interconnection Filtering
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->has('inventory_item_id')) {
            $query->where('inventory_item_id', $request->inventory_item_id);
        }
        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }
        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }
        if ($request->has('transaction_id')) {
            $query->where('transaction_id', $request->transaction_id);
        }

        // Search in title or custom metadata
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('document_type', 'like', "%{$search}%")
                  ->orWhere('custom_metadata', 'like', "%{$search}%");
            });
        }

        // Role-based document category filtering
        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            // Find all categories that this user's role is allowed to access
            $allowedSlugs = \App\Models\DocumentCategory::all()
                ->filter(function ($cat) use ($user) {
                    return is_null($cat->allowed_roles) || in_array($user->role, $cat->allowed_roles);
                })
                ->pluck('slug')
                ->toArray();
            
            $query->whereIn('document_type', $allowedSlugs);
        }

        $documents = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    /**
     * Store a newly uploaded/created document with its customizable metadata and linkages.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'document_type' => 'required|string|max:255',
            'file' => 'nullable|file|max:10240', // Max 10MB standard file
            'file_base64' => 'nullable|string',   // Or Base64 encoded payload
            'amount' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'inventory_item_id' => 'nullable|exists:inventory_items,id',
            'driver_id' => 'nullable|exists:users,id',
            'transaction_type' => 'nullable|string|max:255',
            'transaction_id' => 'nullable|integer',
            'custom_metadata' => 'nullable|array', // Dynamic user metadata
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate document_type matches a valid category slug and user's role is allowed to upload/access it.
        $category = \App\Models\DocumentCategory::where('slug', $request->document_type)->first();
        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'The selected document category is invalid.'
            ], 422);
        }

        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            if (!is_null($category->allowed_roles) && !in_array($user->role, $category->allowed_roles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You do not have permission to upload/access files in this folder.'
                ], 403);
            }
        }

        $filePath = null;

        // 1. Process Standard File Upload
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = 'procurement/docs/' . Str::random(20) . '.' . $file->getClientOriginalExtension();
            Storage::disk('public')->put($fileName, file_get_contents($file));
            $filePath = $fileName;
        } 
        // 2. Process Base64 File Upload (useful for high-speed SPAs/API calls)
        elseif ($request->filled('file_base64')) {
            $base64Data = $request->input('file_base64');
            if (preg_match('/^data:(\w+\/\w+);base64,/', $base64Data, $type)) {
                $data = substr($base64Data, strpos($base64Data, ',') + 1);
                $mimeType = strtolower($type[1]);
                $extension = 'bin'; // default fallback

                $mimes = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'application/pdf' => 'pdf',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
                    'application/msword' => 'doc',
                ];

                if (isset($mimes[$mimeType])) {
                    $extension = $mimes[$mimeType];
                }

                $fileName = 'procurement/docs/' . Str::random(20) . '.' . $extension;
                Storage::disk('public')->put($fileName, base64_decode($data));
                $filePath = $fileName;
            }
        }

        if (!$filePath) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid file (binary or base64).'
            ], 422);
        }

        $document = ProcurementDocument::create([
            'title' => $request->title,
            'document_type' => $request->document_type,
            'file_path' => $filePath,
            'amount' => $request->amount,
            'supplier_id' => $request->supplier_id,
            'inventory_item_id' => $request->inventory_item_id,
            'driver_id' => $request->driver_id,
            'transaction_type' => $request->transaction_type,
            'transaction_id' => $request->transaction_id,
            'custom_metadata' => $request->custom_metadata ?? [],
            'uploaded_by' => auth()->id() ?? 1, // Fallback to super_admin/system_user ID for test coverage
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Procurement document uploaded and linked successfully',
            'data' => $document->load(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email'])
        ], 201);
    }

    /**
     * Display details of a specific document.
     */
    public function show($id)
    {
        $document = ProcurementDocument::with(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email', 'uploader:id,first_name,last_name,email'])->find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Procurement document not found'
            ], 404);
        }

        // Access check
        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            $category = \App\Models\DocumentCategory::where('slug', $document->document_type)->first();
            if ($category && !is_null($category->allowed_roles) && !in_array($user->role, $category->allowed_roles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this document category.'
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $document
        ]);
    }

    /**
     * Update details and customizable metadata.
     */
    public function update(Request $request, $id)
    {
        $document = ProcurementDocument::findOrFail($id);

        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            if ($document->uploaded_by !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only update documents that you uploaded.'
                ], 403);
            }
        }

        if ($request->has('document_type')) {
            $category = \App\Models\DocumentCategory::where('slug', $request->document_type)->first();
            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected document category is invalid.'
                ], 422);
            }

            if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
                if (!is_null($category->allowed_roles) && !in_array($user->role, $category->allowed_roles)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized. You do not have permission to upload/access files in this folder.'
                    ], 403);
                }
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'document_type' => 'required|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'inventory_item_id' => 'nullable|exists:inventory_items,id',
            'driver_id' => 'nullable|exists:users,id',
            'transaction_type' => 'nullable|string|max:255',
            'transaction_id' => 'nullable|integer',
            'custom_metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $document->update([
            'title' => $request->title,
            'document_type' => $request->document_type,
            'amount' => $request->amount,
            'supplier_id' => $request->supplier_id,
            'inventory_item_id' => $request->inventory_item_id,
            'driver_id' => $request->driver_id,
            'transaction_type' => $request->transaction_type,
            'transaction_id' => $request->transaction_id,
            'custom_metadata' => $request->custom_metadata ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Procurement document references updated successfully',
            'data' => $document->load(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email'])
        ]);
    }

    /**
     * Clean up database records and disk storage file.
     */
    public function destroy($id)
    {
        $document = ProcurementDocument::findOrFail($id);

        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            if ($document->uploaded_by !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only delete documents that you uploaded.'
                ], 403);
            }
        }

        // Delete physical file from storage disk
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Procurement document and storage file deleted successfully'
        ]);
    }
}
