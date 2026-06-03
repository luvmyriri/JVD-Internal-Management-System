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
            // Fallback for non-supplier entities (like driver, bus, client)
            $validated['entity_id'] = random_int(1000, 9999);
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
        $token = Str::random(32);
        
        $baseUrl = null;

        // 1. Try to query the local ngrok API to get the public HTTPS tunnel (for external supplier emails)
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 1.0]]);
            $tunnelsJson = @file_get_contents('http://127.0.0.1:4040/api/tunnels', false, $ctx);
            if ($tunnelsJson) {
                $tunnelsData = json_decode($tunnelsJson, true);
                if (isset($tunnelsData['tunnels']) && is_array($tunnelsData['tunnels'])) {
                    foreach ($tunnelsData['tunnels'] as $tunnel) {
                        if (isset($tunnel['public_url']) && str_starts_with($tunnel['public_url'], 'https://')) {
                            $baseUrl = rtrim($tunnel['public_url'], '/');
                            break;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            // Unreachable or offline - fall back quietly
        }
        
        // 2. Dynamically detect base URL from request referer or origin to handle ngrok headers
        if (!$baseUrl) {
            $referer = $request->headers->get('referer');
            if ($referer) {
                $parsed = parse_url($referer);
                if (isset($parsed['scheme']) && isset($parsed['host'])) {
                    $baseUrl = $parsed['scheme'] . '://' . $parsed['host'] . (isset($parsed['port']) ? ':' . $parsed['port'] : '');
                }
            }
        }
        
        if (!$baseUrl) {
            $origin = $request->headers->get('origin');
            if ($origin) {
                $baseUrl = rtrim($origin, '/');
            }
        }
        
        if (!$baseUrl) {
            // Fallback to configured frontend url matching current request host or default
            $frontendUrls = explode(',', env('FRONTEND_URL', 'http://localhost:3000'));
            $baseUrl = rtrim($frontendUrls[0], '/');
            
            $requestHost = $request->getHost();
            foreach ($frontendUrls as $url) {
                if (str_contains($url, $requestHost)) {
                    $baseUrl = rtrim($url, '/');
                    break;
                }
            }
        }
        
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

        if ($accreditation->entity_type === 'supplier' && $accreditation->entity_id) {
            $supplier = \App\Models\Supplier::find($accreditation->entity_id);
            if ($supplier) {
                $supplier->update([
                    'accreditation_status' => 'accredited',
                    'is_verified'          => true,
                    'verified_at'          => now(),
                    'verified_by'          => 1, // System verified upon compliance upload
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
