<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccreditationResource;
use App\Models\Accreditation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\KycRequestMail;

class AccreditationController extends Controller
{
    public function index(Request $request)
    {
        $query = Accreditation::query();

        if ($request->has('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->has('entity_types')) {
            $types = explode(',', $request->entity_types);
            $query->whereIn('entity_type', $types);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $query->where('entity_name', 'ilike', '%' . $request->search . '%');
        }

        $accreditations = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => AccreditationResource::collection($accreditations)->resolve(),
            'meta'    => [
                'current_page' => $accreditations->currentPage(),
                'last_page'    => $accreditations->lastPage(),
                'per_page'     => $accreditations->perPage(),
                'total'        => $accreditations->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'entity_type' => 'required|string',
            'entity_name' => 'required|string',
            'accreditation_type' => 'required|string',
            'issuing_body' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'contact_person' => 'required|string',
            'contact_email' => 'required|email',
        ]);

        // Simulating the entity ID for now if we don't have exact relations (e.g. they aren't created yet)
        $validated['entity_id'] = random_int(1000, 9999);
        $validated['status'] = 'pending_renewal'; // Initial state waiting for KYC

        $accreditation = Accreditation::create($validated);

        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation),
            'message' => 'Accreditation record created.',
        ], 201);
    }

    public function show(Accreditation $accreditation)
    {
        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation),
        ]);
    }

    public function update(Request $request, Accreditation $accreditation)
    {
        $validated = $request->validate([
            'status' => 'string|in:active,expired,pending_renewal',
            // Allow manual overrides for documents in backend
            'kyc_document_url' => 'nullable|string',
            'nda_document_url' => 'nullable|string',
            'terms_document_url' => 'nullable|string',
        ]);

        $accreditation->update($validated);
        
        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation),
            'message' => 'Accreditation record updated.',
        ]);
    }

    public function destroy(Accreditation $accreditation)
    {
        $accreditation->delete();
        return response()->noContent();
    }

    public function generateKycLink(Accreditation $accreditation)
    {
        // Business Requirement: "System generates a Gmail-accessible submission link/form for the supplier/partner/client to upload their KYC documents."
        $token = Str::random(32);
        
        $frontendUrls = explode(',', env('FRONTEND_URL', 'http://localhost:3000'));
        $baseUrl = rtrim($frontendUrls[0], '/');
        
        $accreditation->update(['kyc_token' => $token]);
        $link = $baseUrl . '/kyc-submission?token=' . $token . '&ref=' . $accreditation->id;

        // Send the actual email
        Mail::to($accreditation->contact_email)->send(new KycRequestMail($link, $accreditation));

        return response()->json([
            'message' => 'KYC request link generated successfully.',
            'link' => $link,
            'email_sent_to' => $accreditation->contact_email,
        ]);
    }

    public function verifyToken(Request $request, Accreditation $accreditation)
    {
        $token = $request->query('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired token.'], 403);
        }
        return response()->json([
            'success' => true,
            'data' => [
                'entity_name' => $accreditation->entity_name,
                'contact_person' => $accreditation->contact_person,
                'contact_email' => $accreditation->contact_email,
            ]
        ]);
    }

    public function submitKyc(Request $request, Accreditation $accreditation)
    {
        $token = $request->input('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['message' => 'Forbidden: Invalid or expired compliance session.'], 403);
        }

        $validated = $request->validate([
            'nda_document_url'   => 'required|string',
            'terms_document_url' => 'required|string',
            'kyc_document_url'   => 'required|string',
            'entity_name'        => 'nullable|string|max:255',
            'contact_person'     => 'nullable|string|max:255',
            'contact_email'      => 'nullable|string|email|max:255',
        ]);

        $accreditation->update(array_merge($validated, [
            'status' => 'active', // Set active upon submission
        ]));

        return response()->json(['message' => 'KYC documents submitted successfully.']);
    }

    public function uploadDocumentPublic(Request $request, Accreditation $accreditation, $type)
    {
        $token = $request->query('token') ?: $request->input('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['success' => false, 'message' => 'Forbidden: Invalid or expired compliance session.'], 403);
        }
        return $this->uploadDocument($request, $accreditation, $type);
    }

    public function uploadDocument(Request $request, Accreditation $accreditation, $type)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        $validTypes = ['kyc', 'nda', 'terms', 'main'];
        if (!in_array($type, $validTypes)) {
            return response()->json(['success' => false, 'message' => 'Invalid document type'], 400);
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            // Store explicitly inside the public disk
            $path = $file->storeAs("accreditations/{$accreditation->id}/{$type}", $filename, 'public');
            
            // Generate public URL using the public disk
            $url = \Illuminate\Support\Facades\Storage::disk('public')->url($path);
            
            $column = $type === 'main' ? 'document_url' : "{$type}_document_url";
            $accreditation->update([$column => $url]);

            return response()->json([
                'success' => true,
                'url' => $url,
                'message' => ucfirst($type) . ' document uploaded successfully.'
            ]);
        }

        return response()->json(['success' => false, 'message' => 'No file uploaded'], 400);
    }
}
