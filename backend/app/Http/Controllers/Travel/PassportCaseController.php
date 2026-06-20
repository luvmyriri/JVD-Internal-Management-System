<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePassportCaseRequest;
use App\Http\Resources\PassportCaseResource;
use App\Models\PassportCase;
use App\Models\PassportCaseDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\VisaDocumentRequestMail;

class PassportCaseController extends Controller
{
    /**
     * Valid DFA/Embassy processing status transitions.
     * Mirrors § 5.4 of JVD_System_Architecture.pdf
     */
    private const STATUS_TRANSITIONS = [
        'requirements_gathering' => ['documents_complete'],
        'documents_complete'     => ['submitted_for_processing', 'requirements_gathering'],
        'submitted_for_processing' => ['processing'],
        'processing'             => ['denied', 'ready_for_release'],
        'ready_for_release'      => ['released'],
        'denied'                 => ['requirements_gathering'], // Allow re-application
    ];

    /**
     * List passport/visa cases — filterable by status, case_type, handled_by.
     * Agents only see cases they are handling.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PassportCase::with(['customer', 'passenger', 'handler']);

        $user = $request->user();
        if (!$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            $query->where('handled_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('case_type')) {
            $query->where('case_type', $request->case_type);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $cases = $query->orderByDesc('created_at')
                       ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => PassportCaseResource::collection($cases)->resolve(),
            'meta'    => [
                'current_page' => $cases->currentPage(),
                'last_page'    => $cases->lastPage(),
                'per_page'     => $cases->perPage(),
                'total'        => $cases->total(),
            ],
        ]);
    }

    /**
     * Open a new passport or visa case.
     * Handler is automatically set to the authenticated user.
     */
    public function store(StorePassportCaseRequest $request): JsonResponse
    {
        $customerId = $request->input('customer_id');
        $passengerId = $request->input('passenger_id');

        if (!$customerId) {
            $customer = \App\Models\Customer::firstOrCreate([
                'first_name'  => $request->input('first_name'),
                'middle_name' => $request->input('middle_name'),
                'last_name'   => $request->input('last_name'),
                'suffix'      => $request->input('suffix'),
            ]);
            $customerId = $customer->id;

            $passenger = \App\Models\Passenger::firstOrCreate([
                'customer_id' => $customerId,
                'first_name'  => $request->input('first_name'),
                'middle_name' => $request->input('middle_name'),
                'last_name'   => $request->input('last_name'),
                'suffix'      => $request->input('suffix'),
            ]);
            $passengerId = $passenger->id;
        } else {
            $customer = \App\Models\Customer::find($customerId);
            $passenger = \App\Models\Passenger::find($passengerId);
        }

        if ($customer) {
            $customer->update(array_filter([
                'email'   => $request->input('email'),
                'phone'   => $request->input('phone'),
                'address' => $request->input('address'),
            ]));
        }

        if ($passenger) {
            $passenger->update(array_filter([
                'birth_date' => $request->input('birth_date'),
                'contact_no' => $request->input('phone') ?: $request->input('contact_no'),
            ]));
        }

        $data = array_merge($request->validated(), [
            'customer_id'  => $customerId,
            'passenger_id' => $passengerId,
            'handled_by'   => $request->user()->id,
            'status'       => 'requirements_gathering',
        ]);

        unset($data['first_name'], $data['last_name'], $data['middle_name'], $data['suffix'], $data['email'], $data['phone'], $data['address'], $data['birth_date']);

        $case = PassportCase::create($data);
        
        \App\Http\Services\AuditLogService::log('create', 'Travel', 'PassportCase', $case->id, null, $case->toArray());

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource($case->load(['customer', 'passenger', 'handler'])),
            'message' => 'Passport case opened successfully.',
        ], 201);
    }

    /**
     * Get a single case with all its details.
     */
    /**
     * H-03: ensure the user may act on this case. Mirrors index() scoping — privileged roles
     * see everything; everyone else may only touch cases they are assigned to handle.
     */
    private function ensureCanAccessCase(PassportCase $passportCase): void
    {
        $user = auth()->user();
        if (!$user) {
            abort(403, 'Unauthorized.');
        }
        if ($user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            return;
        }
        if ((int) $passportCase->handled_by !== (int) $user->id) {
            abort(403, 'You are not authorized to access this case.');
        }
    }

    public function show(PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource(
                $passportCase->load(['customer', 'passenger', 'handler'])
            ),
        ]);
    }

    /**
     * Update case — field edits and status transitions.
     */
    public function update(Request $request, PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        // Status transition with state machine guard
        if ($request->filled('status')) {
            $newStatus = $request->status;
            $current   = $passportCase->status;

            $allowed = self::STATUS_TRANSITIONS[$current] ?? [];

            if (!in_array($newStatus, $allowed)) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot transition case from '{$current}' to '{$newStatus}'.",
                ], 422);
            }
        }

        $validated = $request->validate([
            'status'           => ['sometimes', 'string'],
            'reference_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'checklist'        => ['sometimes', 'nullable', 'array'],
            'submitted_date'   => ['sometimes', 'nullable', 'date'],
            'release_date'     => ['sometimes', 'nullable', 'date'],
            'handled_by'       => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $old = $passportCase->toArray();
        $passportCase->update($validated);
        
        \App\Http\Services\AuditLogService::log('update', 'Travel', 'PassportCase', $passportCase->id, $old, $passportCase->fresh()->toArray());

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource(
                $passportCase->fresh(['customer', 'passenger', 'handler'])
            ),
            'message' => 'Passport case updated.',
        ]);
    }

    /**
     * Transition status with state machine guard (PATCH /passport-cases/{id}/status).
     */
    public function updateStatus(Request $request, PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $request->validate(['status' => ['required', 'string']]);

        $newStatus = $request->status;
        $current   = $passportCase->status;
        $allowed   = self::STATUS_TRANSITIONS[$current] ?? [];

        if (!in_array($newStatus, $allowed)) {
            return response()->json([
                'success' => false,
                'message' => "Cannot transition from '{$current}' to '{$newStatus}'.",
            ], 422);
        }

        // H-01: status change and auto-invoice generation must be atomic — if invoice creation
        // fails the status must roll back too, otherwise the case is stuck 'released' with no invoice.
        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $passportCase, $newStatus, $current) {
            $old = $passportCase->toArray();
            $passportCase->update(['status' => $newStatus]);

            \App\Http\Services\AuditLogService::log('update_status', 'Travel', 'PassportCase', $passportCase->id, $old, $passportCase->fresh()->toArray());

            // Create an Invoice if the case is released
            if ($newStatus === 'released' && $current !== 'released') {
                $customer = $passportCase->customer;
                $invoiceNumber = 'INV-' . date('Ymd') . '-P' . str_pad($passportCase->id, 4, '0', STR_PAD_LEFT);

                // Avoid duplicate invoices
                $existingInvoice = \App\Models\Invoice::where('invoice_number', $invoiceNumber)->first();

                if (!$existingInvoice) {
                    \App\Models\Invoice::create([
                        'invoice_number'   => $invoiceNumber,
                        'customer_id'      => $customer->id,
                        'customer_name'    => $customer->first_name . ' ' . $customer->last_name,
                        'customer_email'   => $customer->email,
                        'customer_contact' => $customer->phone,
                        'customer_address' => $customer->address ?? '',
                        'subtotal'         => 0,
                        'tax_amount'       => 0,
                        'total_amount'     => 0,
                        'balance'          => 0,
                        'status'           => 'pending',
                        'created_by'       => $request->user()->id,
                        'notes'            => 'Auto-generated invoice for Released Passport/Visa Case: ' . ($passportCase->reference_number ?? 'N/A'),
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource($passportCase->fresh(['customer', 'passenger', 'handler'])),
            'message' => 'Status updated.',
        ]);
    }

    /**
     * Update document checklist (PATCH /passport-cases/{id}/checklist).
     */
    public function updateChecklist(Request $request, PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $request->validate(['checklist' => ['required', 'array']]);

        $old = $passportCase->toArray();
        $passportCase->update(['checklist' => $request->checklist]);
        
        \App\Http\Services\AuditLogService::log('update_checklist', 'Travel', 'PassportCase', $passportCase->id, $old, $passportCase->fresh()->toArray());

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource($passportCase->fresh(['customer', 'passenger', 'handler'])),
            'message' => 'Checklist updated.',
        ]);
    }
    
    /**
     * Retrieve audit logs for a specific passport case.
     */
    public function auditLogs(PassportCase $passportCase): JsonResponse
    {
        $logs = \App\Models\AuditLog::with('user')
            ->where('target_model', 'PassportCase')
            ->where('target_id', $passportCase->id)
            ->orderByDesc('created_at')
            ->get();
            
        return response()->json([
            'success' => true,
            'data'    => \App\Http\Resources\AuditLogResource::collection($logs)->resolve(),
        ]);
    }

    /**
     * Retrieve documents uploaded for a specific passport case.
     */
    public function getDocuments(PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $documents = PassportCaseDocument::with('uploader:id,first_name,last_name,email')
            ->where('passport_case_id', $passportCase->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $documents,
        ]);
    }

    /**
     * Upload a new document for a specific passport case.
     */
    public function uploadDocument(Request $request, PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            // C-01: restrict to safe document/image types — never store client-supplied executables.
            'file'  => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'], // Max 10MB
        ]);

        $file = $request->file('file');
        // Use the server-resolved extension, not the client-supplied original name.
        $extension = $file->extension() ?: $file->getClientOriginalExtension();
        $fileName = 'passport_cases/' . $passportCase->id . '/' . Str::random(20) . '.' . $extension;
        Storage::disk('public')->put($fileName, file_get_contents($file));

        $document = PassportCaseDocument::create([
            'passport_case_id' => $passportCase->id,
            'customer_id'      => $passportCase->customer_id,
            'title'            => $request->input('title'),
            'file_path'        => $fileName,
            'uploaded_by'      => auth()->id() ?? 1, // Fallback to 1 for tests/seeding
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded and linked successfully.',
            'data'    => $document->load('uploader:id,first_name,last_name,email'),
        ], 201);
    }

    /**
     * Delete a document.
     */
    public function deleteDocument(PassportCase $passportCase, $documentId): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $document = PassportCaseDocument::where('id', $documentId)
            ->where('passport_case_id', $passportCase->id)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found or does not belong to this case.',
            ], 404);
        }

        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully.',
        ]);
    }

    /**
     * Send automatic email request with secure upload link to customer.
     */
    public function sendDocumentRequest(Request $request, PassportCase $passportCase): JsonResponse
    {
        $this->ensureCanAccessCase($passportCase);

        $passportCase->load(['customer', 'passenger']);

        if (!$passportCase->customer || empty($passportCase->customer->email)) {
            return response()->json([
                'success' => false,
                'message' => 'Customer must have an email address to request documents online.',
            ], 422);
        }

        $request->validate([
            'requested_docs'   => ['required', 'array'],
            'requested_docs.*' => ['required', 'string'],
        ]);

        $requestedDocs = $request->input('requested_docs');
        $token = Str::random(32);

        $passportCase->update([
            'upload_token'          => $token,
            'upload_requested_docs' => $requestedDocs,
            'upload_email_sent_at'  => now(),
        ]);

        $baseUrl = null;

        // 1. Try ngrok tunnel
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
        } catch (\Throwable $e) {}

        // 2. Referer header
        if (!$baseUrl) {
            $referer = $request->headers->get('referer');
            if ($referer) {
                $parsed = parse_url($referer);
                if (isset($parsed['scheme']) && isset($parsed['host'])) {
                    $baseUrl = $parsed['scheme'] . '://' . $parsed['host'] . (isset($parsed['port']) ? ':' . $parsed['port'] : '');
                }
            }
        }

        // 3. Origin header
        if (!$baseUrl) {
            $origin = $request->headers->get('origin');
            if ($origin) {
                $baseUrl = rtrim($origin, '/');
            }
        }

        // 4. Fallback to Env
        if (!$baseUrl) {
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

        $link = $baseUrl . '/public/visa-upload/' . $token;

        // Dispatch Email
        $mailError = null;
        try {
            Mail::to($passportCase->customer->email)->send(new VisaDocumentRequestMail($link, $passportCase, $requestedDocs));
        } catch (\Throwable $e) {
            $mailError = $e->getMessage();
            \Illuminate\Support\Facades\Log::error('Failed to send document request email to ' . $passportCase->customer->email . ': ' . $mailError);
        }

        // Log Audit
        \App\Http\Services\AuditLogService::log(
            'send_document_request',
            'Travel',
            'PassportCase',
            $passportCase->id,
            null,
            [
                'requested_docs' => $requestedDocs,
                'email'          => $passportCase->customer->email,
                'mail_error'     => $mailError,
            ]
        );

        return response()->json([
            'success'       => true,
            'link'          => $link,
            'message'       => $mailError
                ? 'Document request generated successfully, but the email could not be sent: ' . $mailError
                : 'Document request email sent successfully to ' . $passportCase->customer->email,
            'email_sent_to' => $passportCase->customer->email,
            'mail_error'    => $mailError,
        ]);
    }

    /**
     * Retrieve public case details and requested requirements checklist.
     */
    public function verifyPublicToken(Request $request, $token): JsonResponse
    {
        $case = PassportCase::with(['customer', 'passenger'])
            ->where('upload_token', $token)
            ->first();

        if (!$case) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Invalid or expired upload token.',
            ], 403);
        }

        // Fetch titles of documents already uploaded to check off from requested list
        $uploadedDocsQuery = PassportCaseDocument::where('passport_case_id', $case->id)->get();
        
        $uploadedDocs = $uploadedDocsQuery
            ->pluck('title')
            ->map(fn($t) => trim(strtolower($t)))
            ->toArray();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                  => $case->id,
                'case_type'           => $case->case_type,
                'customer_name'       => $case->customer->first_name . ' ' . $case->customer->last_name,
                'passenger_name'      => $case->passenger->first_name . ' ' . $case->passenger->last_name,
                'destination_country' => $case->destination_country,
                'visa_type'           => $case->visa_type,
                'status'              => $case->status,
                'requested_docs'      => $case->upload_requested_docs ?? [],
                'uploaded_docs'       => $uploadedDocs,
                // C-04: do NOT expose file_path / download links on this unauthenticated
                // endpoint — anyone holding the link could otherwise download sensitive scans.
                // Only the title and upload timestamp are returned so the portal can show status.
                'documents'           => $uploadedDocsQuery->map(fn($doc) => [
                    'id'         => $doc->id,
                    'title'      => $doc->title,
                    'created_at' => $doc->created_at,
                ]),
            ],
        ]);
    }

    /**
     * Handle public document uploads using token authentication.
     */
    public function uploadPublicDocument(Request $request, $token): JsonResponse
    {
        $case = PassportCase::where('upload_token', $token)->first();

        if (!$case) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Invalid or expired upload token.',
            ], 403);
        }

        $request->validate([
            'title' => ['required', 'string'],
            'file'  => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // Max 10MB
        ]);

        $requested = array_map('strtolower', array_map('trim', $case->upload_requested_docs ?? []));
        $uploadTitle = trim($request->input('title'));

        if (!in_array(strtolower($uploadTitle), $requested)) {
            return response()->json([
                'success' => false,
                'message' => 'Document title is not requested for online upload.',
            ], 422);
        }

        $file = $request->file('file');
        $fileName = 'passport_cases/' . $case->id . '/' . Str::random(20) . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->put($fileName, file_get_contents($file));

        $document = PassportCaseDocument::create([
            'passport_case_id' => $case->id,
            'customer_id'      => $case->customer_id,
            'title'            => $uploadTitle,
            'file_path'        => $fileName,
            'uploaded_by'      => null, // Guest upload
        ]);

        // Sync and mark checklist item as true
        $checklist = $case->checklist ?? [];
        $matchedKey = null;
        foreach (array_keys($checklist) as $key) {
            if (strtolower(trim($key)) === strtolower($uploadTitle)) {
                $matchedKey = $key;
                break;
            }
        }

        if ($matchedKey) {
            $checklist[$matchedKey] = true;
        } else {
            $checklist[$uploadTitle] = true;
        }

        $case->update(['checklist' => $checklist]);

        // In-App Alert to Case Handler
        \App\Http\Services\NotificationService::notifyCustomerDocumentUpload($case, $uploadTitle);

        // Log Audit Trail
        \App\Http\Services\AuditLogService::log(
            'customer_document_upload',
            'Travel',
            'PassportCase',
            $case->id,
            null,
            ['title' => $uploadTitle, 'file_path' => $fileName]
        );

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded and checklist item completed successfully.',
            'data'    => $document,
        ], 201);
    }
}

