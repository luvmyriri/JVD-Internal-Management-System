<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Accreditation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AccreditationController extends Controller
{
    public function index(Request $request)
    {
        $query = Accreditation::query();

        if ($request->has('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $query->where('entity_name', 'ilike', '%' . $request->search . '%');
        }

        return $query->latest()->paginate(20);
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

        return response()->json($accreditation, 201);
    }

    public function show(Accreditation $accreditation)
    {
        return $accreditation;
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
        return $accreditation;
    }

    public function destroy(Accreditation $accreditation)
    {
        $accreditation->delete();
        return response()->noContent();
    }

    public function generateKycLink(Accreditation $accreditation)
    {
        // Business Requirement: "System generates a Gmail-accessible submission link/form for the supplier/partner/client to upload their KYC documents."
        // We simulate sending the email and return a generated link.
        $token = Str::random(32);
        
        // This link would be sent via email normally
        $link = config('app.frontend_url', 'http://localhost:3000') . '/kyc-submission?token=' . $token . '&ref=' . $accreditation->id;

        return response()->json([
            'message' => 'KYC request link generated successfully.',
            'link' => $link,
            'email_sent_to' => $accreditation->contact_email,
        ]);
    }

    public function submitKyc(Request $request, Accreditation $accreditation)
    {
        // In a real scenario, we'd validate the token against a database record.
        // For now, we simulate receiving the documents and updating the record.
        $validated = $request->validate([
            'nda_document_url' => 'required|string',
            'terms_document_url' => 'required|string',
            'kyc_document_url' => 'required|string',
        ]);

        $accreditation->update([
            'nda_document_url' => $validated['nda_document_url'],
            'terms_document_url' => $validated['terms_document_url'],
            'kyc_document_url' => $validated['kyc_document_url'],
            'status' => 'active', // For demo we set directly to active upon upload
        ]);

        return response()->json(['message' => 'KYC documents submitted successfully.']);
    }
}
