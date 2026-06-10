<?php
 
namespace App\Http\Controllers\Procurement;
 
use App\Http\Controllers\Controller;
use App\Models\DocumentCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
 
class DocumentCategoryController extends Controller
{
    /**
     * Display a listing of the categories.
     */
    public function index()
    {
        $categories = DocumentCategory::orderBy('name')->get();
        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }
 
    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request)
    {
        // Enforce Super Admin check
        if (auth()->user()?->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin can create folders.'
            ], 403);
        }
 
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:document_categories,name',
            'allowed_roles' => 'nullable|array',
            'allowed_roles.*' => 'string'
        ]);
 
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
 
        $slug = Str::slug($request->name);
 
        // Ensure slug is unique
        $originalSlug = $slug;
        $count = 1;
        while (DocumentCategory::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $count;
            $count++;
        }
 
        $category = DocumentCategory::create([
            'name' => $request->name,
            'slug' => $slug,
            'allowed_roles' => $request->allowed_roles ?? null
        ]);
 
        return response()->json([
            'success' => true,
            'message' => 'Folder category created successfully',
            'data' => $category
        ], 201);
    }
 
    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, $id)
    {
        // Enforce Super Admin check
        if (auth()->user()?->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin can manage folders.'
            ], 403);
        }
 
        $category = DocumentCategory::findOrFail($id);
 
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:document_categories,name,' . $category->id,
            'allowed_roles' => 'nullable|array',
            'allowed_roles.*' => 'string'
        ]);
 
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
 
        // Do not allow updating the slug of default folders
        $isDefault = in_array($category->slug, ['receipt', 'invoice', 'delivery_note', 'agreement', 'other']);
 
        $updateData = [
            'name' => $request->name,
            'allowed_roles' => $request->allowed_roles ?? null
        ];
 
        if (!$isDefault) {
            $updateData['slug'] = Str::slug($request->name);
        }
 
        $category->update($updateData);
 
        return response()->json([
            'success' => true,
            'message' => 'Folder category updated successfully',
            'data' => $category
        ]);
    }
 
    /**
     * Remove the specified category from storage.
     */
    public function destroy($id)
    {
        // Enforce Super Admin check
        if (auth()->user()?->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin can delete folders.'
            ], 403);
        }
 
        $category = DocumentCategory::findOrFail($id);
 
        // Do not allow deleting system default categories
        if (in_array($category->slug, ['receipt', 'invoice', 'delivery_note', 'agreement', 'other'])) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. System default folders cannot be deleted.'
            ], 400);
        }
 
        $category->delete();
 
        return response()->json([
            'success' => true,
            'message' => 'Folder category deleted successfully'
        ]);
    }
}
