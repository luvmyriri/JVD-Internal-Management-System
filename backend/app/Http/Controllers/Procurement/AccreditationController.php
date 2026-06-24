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
            $query->where('entity_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', '%' . $request->search . '%');
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
            'custom_documents' => 'nullable|array|max:20',
            'custom_documents.*' => 'required|string|max:100',
        ]);

        $validated['status'] = 'pending_renewal'; // Initial state waiting for KYC

        if (empty($validated['issue_date'])) {
            $validated['issue_date'] = now()->toDateString();
        }
        if (empty($validated['expiry_date'])) {
            $validated['expiry_date'] = now()->addYears(1)->toDateString();
        }
        if (empty($validated['issuing_body'])) {
            $validated['issuing_body'] = 'JVD Management';
        }

        $customDocs = [];
        $customDocsInput = $request->input('custom_documents');
        if (is_array($customDocsInput) && count($customDocsInput) > 0) {
            foreach ($customDocsInput as $docName) {
                if (empty($docName)) continue;
                $customDocs[] = [
                    'name' => $docName,
                    'key' => Str::slug($docName, '_'),
                    'url' => null,
                    'status' => 'pending'
                ];
            }
        } else {
            $customDocs = [
                ['name' => 'KYC Doc', 'key' => 'kyc', 'url' => null, 'status' => 'pending'],
                ['name' => 'NDA Doc', 'key' => 'nda', 'url' => null, 'status' => 'pending'],
                ['name' => 'Terms Doc', 'key' => 'terms', 'url' => null, 'status' => 'pending'],
            ];
        }
        $validated['custom_documents'] = $customDocs;

        if ($validated['entity_type'] === 'supplier') {
            // Find existing supplier by name or email
            $supplier = \App\Models\Supplier::where('company_name', $validated['entity_name'])
                ->orWhere('email', $validated['contact_email'])
                ->first();

            if (!$supplier) {
                // Auto-create Supplier
                $supplier = \App\Models\Supplier::create([
                    'company_name'         => $validated['entity_name'],
                    'contact_person'       => $validated['contact_person'],
                    'email'                => $validated['contact_email'],
                    'accreditation_status' => 'pending',
                    'is_verified'          => false,
                ]);
            } else {
                // Update empty contact fields to ensure perfect sync
                $updates = [];
                if (empty($supplier->contact_person) && !empty($validated['contact_person'])) {
                    $updates['contact_person'] = $validated['contact_person'];
                }
                if (empty($supplier->email) && !empty($validated['contact_email'])) {
                    $updates['email'] = $validated['contact_email'];
                }
                if (!empty($updates)) {
                    $supplier->update($updates);
                }
            }

            $validated['entity_id'] = $supplier->id;
        } else {
            // H-02: resolve the real database id for non-supplier entities instead of a random
            // fake id that would corrupt the polymorphic entity() relationship. Reject if the
            // referenced entity cannot be found.
            $entityName  = trim($validated['entity_name'] ?? '');
            $entityEmail = $validated['contact_email'] ?? null;
            $resolvedId  = null;

            switch ($validated['entity_type']) {
                case 'driver':
                    $resolvedId = \App\Models\User::where('role', 'driver')
                        ->when($entityEmail, fn($q) => $q->where('email', $entityEmail))
                        ->when(!$entityEmail && $entityName !== '', fn($q) => $q->whereRaw("LOWER(CONCAT(first_name, ' ', last_name)) = ?", [strtolower($entityName)]))
                        ->value('id');
                    break;
                case 'bus':
                    $resolvedId = \App\Models\Bus::where('plate_number', $entityName)
                        ->orWhere('model', $entityName)
                        ->value('id');
                    break;
                case 'client':
                case 'customer':
                    $resolvedId = \App\Models\Customer::when($entityEmail, fn($q) => $q->where('email', $entityEmail))
                        ->when(!$entityEmail && $entityName !== '', fn($q) => $q->whereRaw("LOWER(CONCAT(first_name, ' ', last_name)) = ?", [strtolower($entityName)]))
                        ->value('id');
                    break;
            }

            if (!$resolvedId) {
                return response()->json([
                    'success' => false,
                    'message' => "Could not find a {$validated['entity_type']} matching '{$entityName}'. Please register the entity first.",
                ], 422);
            }

            $validated['entity_id'] = $resolvedId;
        }

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

        if ($accreditation->entity_type === 'supplier' && $accreditation->entity_id) {
            $supplier = \App\Models\Supplier::find($accreditation->entity_id);
            if ($supplier) {
                if ($accreditation->status === 'active') {
                    $supplier->update([
                        'accreditation_status' => 'accredited',
                        'is_verified'          => true,
                        'verified_at'          => now(),
                        'verified_by'          => auth()->id() ?: 1,
                    ]);
                } elseif ($accreditation->status === 'expired') {
                    $supplier->update([
                        'accreditation_status' => 'suspended',
                        'is_verified'          => false,
                    ]);
                } elseif ($accreditation->status === 'pending_renewal') {
                    $supplier->update([
                        'accreditation_status' => 'pending',
                        'is_verified'          => false,
                    ]);
                }
            }
        }
        
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

    public function generateKycLink(Request $request, Accreditation $accreditation)
    {
        // Business Requirement: "System generates a Gmail-accessible submission link/form for the supplier/partner/client to upload their KYC documents."
        // Legacy column kept in sync for any code still reading it directly, but the unified
        // CustomerPortalToken is now the source of truth for new links going forward.
        $token = Str::random(32);
        $accreditation->update(['kyc_token' => $token]);

        $portalToken = \App\Models\CustomerPortalToken::generateFor('Accreditation', $accreditation->id, 'document_upload');
        $link = \App\Http\Services\PortalLinkResolver::buildPortalLink($portalToken->token, $request);

        // C-10/Phase 3: never let an SMTP failure crash this request — log and report instead.
        $mailError = null;
        try {
            Mail::to($accreditation->contact_email)->send(new KycRequestMail($link, $accreditation));
        } catch (\Throwable $e) {
            $mailError = $e->getMessage();
            \Illuminate\Support\Facades\Log::error('Failed to send KYC request email to ' . $accreditation->contact_email . ': ' . $mailError);
        }

        return response()->json([
            'message' => 'KYC request link generated successfully.',
            'link' => $link,
            'email_sent_to' => $accreditation->contact_email,
            'mail_error' => $mailError,
        ]);
    }

    public function verifyToken(Request $request, Accreditation $accreditation)
    {
        $token = $request->query('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired token.'], 403);
        }

        if ($accreditation->updated_at && $accreditation->updated_at->lt(now()->subDays(30))) {
            return response()->json(['success' => false, 'message' => 'This KYC link has expired. Please request a new one.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'entity_name' => $accreditation->entity_name,
                'contact_person' => $accreditation->contact_person,
                'contact_email' => $accreditation->contact_email,
                'custom_documents' => $accreditation->custom_documents,
            ]
        ]);
    }

    public function submitKyc(Request $request, Accreditation $accreditation)
    {
        $token = $request->input('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['message' => 'Forbidden: Invalid or expired compliance session.'], 403);
        }

        if ($accreditation->updated_at && $accreditation->updated_at->lt(now()->subDays(30))) {
            return response()->json(['message' => 'This KYC link has expired. Please request a new one.'], 403);
        }

        $validated = $request->validate([
            'nda_document_url'   => 'nullable|string',
            'terms_document_url' => 'nullable|string',
            'kyc_document_url'   => 'nullable|string',
            'entity_name'        => 'nullable|string|max:255',
            'contact_person'     => 'nullable|string|max:255',
            'contact_email'      => 'nullable|string|email|max:255',
        ]);

        // Validate that all custom documents are uploaded
        $customDocs = $accreditation->custom_documents ?? [];
        foreach ($customDocs as $doc) {
            if (empty($doc['url'])) {
                return response()->json([
                    'message' => 'Validation failed: Please upload all required compliance documents: ' . $doc['name']
                ], 422);
            }
        }

        $accreditation->update(array_merge($validated, [
            'status' => 'active', // Set active upon submission
        ]));

        if ($accreditation->entity_type === 'supplier' && $accreditation->entity_id) {
            $supplier = \App\Models\Supplier::find($accreditation->entity_id);
            if ($supplier) {
                // H-01: do NOT auto-accredit/verify on document submission — that lets suppliers
                // self-verify with dummy documents. Leave the supplier 'pending' so an authorized
                // admin must manually review and verify via the suppliers/{id}/verify endpoint.
                $supplier->update([
                    'accreditation_status' => 'pending',
                    'is_verified'          => false,
                ]);
            }
        }

        \App\Http\Services\NotificationService::notifyKycSubmission($accreditation);

        return response()->json(['message' => 'KYC documents submitted successfully.']);
    }

    public function uploadDocumentPublic(Request $request, Accreditation $accreditation, $type)
    {
        $token = $request->query('token') ?: $request->input('token');
        if (empty($accreditation->kyc_token) || $token !== $accreditation->kyc_token) {
            return response()->json(['success' => false, 'message' => 'Forbidden: Invalid or expired compliance session.'], 403);
        }

        if ($accreditation->updated_at && $accreditation->updated_at->lt(now()->subDays(30))) {
            return response()->json(['success' => false, 'message' => 'This KYC link has expired. Please request a new one.'], 403);
        }

        return $this->uploadDocument($request, $accreditation, $type);
    }

    public function uploadDocument(Request $request, Accreditation $accreditation, $type)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        $customDocs = $accreditation->custom_documents ?? [];
        $customKeys = array_column($customDocs, 'key');
        $validTypes = array_merge(['kyc', 'nda', 'terms', 'main'], $customKeys);

        if (!in_array($type, $validTypes)) {
            return response()->json(['success' => false, 'message' => 'Invalid document type'], 400);
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            // Store explicitly inside the public disk
            $path = $file->storeAs("accreditations/{$accreditation->id}/{$type}", $filename, 'public');
            
            // Generate public URL using the public disk
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = \Illuminate\Support\Facades\Storage::disk('public');
            $url = $disk->url($path);
            
            if ($type === 'main') {
                $accreditation->document_url = $url;
            } else {
                $foundInCustom = false;
                foreach ($customDocs as &$doc) {
                    if ($doc['key'] === $type) {
                        $doc['url'] = $url;
                        $doc['status'] = 'submitted';
                        $foundInCustom = true;
                        break;
                    }
                }
                if ($foundInCustom) {
                    $accreditation->custom_documents = $customDocs;
                }
                
                if (in_array($type, ['kyc', 'nda', 'terms'])) {
                    $column = "{$type}_document_url";
                    $accreditation->{$column} = $url;
                }
            }
            
            $accreditation->save();

            return response()->json([
                'success' => true,
                'url' => $url,
                'message' => ucfirst($type) . ' document uploaded successfully.'
            ]);
        }

        return response()->json(['success' => false, 'message' => 'No file uploaded'], 400);
    }
}
