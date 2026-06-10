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
    public function show(PassportCase $passportCase): JsonResponse
    {
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
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'file'  => ['required', 'file', 'max:10240'], // Max 10MB
        ]);

        $file = $request->file('file');
        $fileName = 'passport_cases/' . $passportCase->id . '/' . Str::random(20) . '.' . $file->getClientOriginalExtension();
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
}
