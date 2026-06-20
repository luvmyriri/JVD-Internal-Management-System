<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Models\ProcurementDocument;
use App\Models\CustomerKyc;
use App\Models\CustomerPassport;
use App\Models\CustomerVisa;
use App\Models\Accreditation;
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
        // 1. Fetch Procurement Documents
        $procurementDocs = ProcurementDocument::with([
            'supplier', 
            'inventoryItem', 
            'driver:id,first_name,last_name,email', 
            'uploader:id,first_name,last_name,email',
            'customer:id,first_name,last_name,email',
            'jobOrder',
            'workOrder',
            'tripTicket'
        ])->get()->map(function ($doc) {
            return [
                'id' => 'doc_procurement_' . $doc->id,
                'real_id' => $doc->id,
                'source_type' => 'procurement',
                'title' => $doc->title,
                'document_type' => $doc->document_type,
                'file_path' => $doc->file_path,
                'amount' => $doc->amount,
                'custom_metadata' => $doc->custom_metadata ?? [],
                'uploaded_by' => $doc->uploader ? [
                    'id' => $doc->uploader->id,
                    'first_name' => $doc->uploader->first_name,
                    'last_name' => $doc->uploader->last_name,
                    'email' => $doc->uploader->email,
                ] : null,
                'created_at' => $doc->created_at ? $doc->created_at->toIso8601String() : null,
                'updated_at' => $doc->updated_at ? $doc->updated_at->toIso8601String() : null,
                'supplier_id' => $doc->supplier_id,
                'inventory_item_id' => $doc->inventory_item_id,
                'driver_id' => $doc->driver_id,
                'customer_id' => $doc->customer_id,
                'job_order_id' => $doc->job_order_id,
                'work_order_id' => $doc->work_order_id,
                'trip_ticket_id' => $doc->trip_ticket_id,
                'transaction_type' => $doc->transaction_type,
                'transaction_id' => $doc->transaction_id,
                'supplier' => $doc->supplier,
                'inventory_item' => $doc->inventoryItem,
                'driver' => $doc->driver,
                'customer' => $doc->customer,
                'job_order' => $doc->jobOrder,
                'work_order' => $doc->workOrder,
                'trip_ticket' => $doc->tripTicket,
                'linkages' => [
                    'supplier' => $doc->supplier,
                    'inventory_item' => $doc->inventoryItem,
                    'driver' => $doc->driver,
                    'customer' => $doc->customer,
                    'job_order' => $doc->jobOrder,
                    'work_order' => $doc->workOrder,
                    'trip_ticket' => $doc->tripTicket,
                    'connected_to' => $doc->customer ? ('Customer: ' . $doc->customer->first_name . ' ' . $doc->customer->last_name) : 
                                     ($doc->jobOrder ? ('Job Order #' . $doc->jobOrder->jo_number) : 
                                     ($doc->tripTicket ? ('Trip Ticket #' . $doc->tripTicket->control_no) : 
                                     ($doc->workOrder ? ('Work Order #' . $doc->workOrder->wo_number) :
                                     ($doc->supplier ? ('Supplier: ' . $doc->supplier->company_name) : 
                                     ($doc->inventoryItem ? ('Inventory: ' . $doc->inventoryItem->item_name) : 
                                     ($doc->driver ? ('Driver: ' . $doc->driver->first_name . ' ' . $doc->driver->last_name) : 'Unlinked')))))),
                ]
            ];
        });

        // 2. Fetch Customer KYCs
        $kycDocs = CustomerKyc::with(['customer'])->get()->map(function ($kyc) {
            return [
                'id' => 'doc_kyc_' . $kyc->id,
                'real_id' => $kyc->id,
                'source_type' => 'kyc',
                'title' => 'KYC - ' . $kyc->document_type . ($kyc->customer ? (' (' . $kyc->customer->first_name . ' ' . $kyc->customer->last_name . ')') : ''),
                'document_type' => 'kyc',
                'file_path' => $kyc->file_path,
                'amount' => null,
                'custom_metadata' => [
                    'document_number' => $kyc->document_number,
                    'notes' => $kyc->notes,
                ],
                'uploaded_by' => null,
                'created_at' => $kyc->created_at ? $kyc->created_at->toIso8601String() : null,
                'updated_at' => $kyc->updated_at ? $kyc->updated_at->toIso8601String() : null,
                'customer_id' => $kyc->customer_id,
                'customer' => $kyc->customer,
                'linkages' => [
                    'customer' => $kyc->customer,
                    'connected_to' => $kyc->customer ? ('Customer: ' . $kyc->customer->first_name . ' ' . $kyc->customer->last_name) : 'Unlinked',
                ]
            ];
        });

        // 3. Fetch Customer Passports
        $passportDocs = CustomerPassport::with(['customer'])->get()->map(function ($passport) {
            return [
                'id' => 'doc_passport_' . $passport->id,
                'real_id' => $passport->id,
                'source_type' => 'passport',
                'title' => 'Passport - ' . $passport->passport_number . ($passport->customer ? (' (' . $passport->customer->first_name . ' ' . $passport->customer->last_name . ')') : ''),
                'document_type' => 'passport',
                'file_path' => $passport->file_path,
                'amount' => null,
                'custom_metadata' => [
                    'passport_number' => $passport->passport_number,
                    'issue_country' => $passport->issue_country,
                    'issue_date' => $passport->issue_date ? $passport->issue_date->toDateString() : null,
                    'expiry_date' => $passport->expiry_date ? $passport->expiry_date->toDateString() : null,
                    'notes' => $passport->notes,
                ],
                'uploaded_by' => null,
                'created_at' => $passport->created_at ? $passport->created_at->toIso8601String() : null,
                'updated_at' => $passport->updated_at ? $passport->updated_at->toIso8601String() : null,
                'customer_id' => $passport->customer_id,
                'customer' => $passport->customer,
                'linkages' => [
                    'customer' => $passport->customer,
                    'connected_to' => $passport->customer ? ('Customer: ' . $passport->customer->first_name . ' ' . $passport->customer->last_name) : 'Unlinked',
                ]
            ];
        });

        // 4. Fetch Customer Visas
        $visaDocs = CustomerVisa::with(['customer'])->get()->map(function ($visa) {
            return [
                'id' => 'doc_visa_' . $visa->id,
                'real_id' => $visa->id,
                'source_type' => 'visa',
                'title' => 'Visa - ' . $visa->visa_type . ' to ' . $visa->country . ($visa->customer ? (' (' . $visa->customer->first_name . ' ' . $visa->customer->last_name . ')') : ''),
                'document_type' => 'visa',
                'file_path' => $visa->file_path,
                'amount' => null,
                'custom_metadata' => [
                    'visa_number' => $visa->visa_number,
                    'visa_type' => $visa->visa_type,
                    'country' => $visa->country,
                    'issue_date' => $visa->issue_date ? $visa->issue_date->toDateString() : null,
                    'expiry_date' => $visa->expiry_date ? $visa->expiry_date->toDateString() : null,
                    'notes' => $visa->notes,
                ],
                'uploaded_by' => null,
                'created_at' => $visa->created_at ? $visa->created_at->toIso8601String() : null,
                'updated_at' => $visa->updated_at ? $visa->updated_at->toIso8601String() : null,
                'customer_id' => $visa->customer_id,
                'customer' => $visa->customer,
                'linkages' => [
                    'customer' => $visa->customer,
                    'connected_to' => $visa->customer ? ('Customer: ' . $visa->customer->first_name . ' ' . $visa->customer->last_name) : 'Unlinked',
                ]
            ];
        });

        // 5. Fetch Accreditations Documents
        $accreditationDocs = collect();
        Accreditation::all()->each(function ($acc) use ($accreditationDocs) {
            $linkages = [
                'accreditation' => [
                    'id' => $acc->id,
                    'entity_type' => $acc->entity_type,
                    'entity_id' => $acc->entity_id,
                    'entity_name' => $acc->entity_name,
                    'accreditation_type' => $acc->accreditation_type,
                ],
                'connected_to' => 'Accreditation: ' . $acc->entity_name . ' (' . ucfirst($acc->entity_type) . ' - ' . $acc->accreditation_type . ')',
            ];

            $metadata = [
                'accreditation_id' => $acc->id,
                'accreditation_type' => $acc->accreditation_type,
                'issuing_body' => $acc->issuing_body,
                'status' => $acc->status,
                'expiry_date' => $acc->expiry_date ? $acc->expiry_date->toDateString() : null,
            ];

            if ($acc->document_url) {
                $accreditationDocs->push([
                    'id' => 'doc_accreditation_' . $acc->id . '_main',
                    'real_id' => $acc->id,
                    'source_type' => 'accreditation',
                    'title' => 'Accreditation Certificate - ' . $acc->entity_name,
                    'document_type' => 'accreditation',
                    'file_path' => $acc->document_url,
                    'amount' => null,
                    'custom_metadata' => array_merge($metadata, ['doc_type' => 'Certificate']),
                    'uploaded_by' => null,
                    'created_at' => $acc->created_at ? $acc->created_at->toIso8601String() : null,
                    'updated_at' => $acc->updated_at ? $acc->updated_at->toIso8601String() : null,
                    'linkages' => $linkages,
                ]);
            }

            if ($acc->nda_document_url) {
                $accreditationDocs->push([
                    'id' => 'doc_accreditation_' . $acc->id . '_nda',
                    'real_id' => $acc->id,
                    'source_type' => 'accreditation',
                    'title' => 'NDA - ' . $acc->entity_name,
                    'document_type' => 'agreement',
                    'file_path' => $acc->nda_document_url,
                    'amount' => null,
                    'custom_metadata' => array_merge($metadata, ['doc_type' => 'NDA']),
                    'uploaded_by' => null,
                    'created_at' => $acc->created_at ? $acc->created_at->toIso8601String() : null,
                    'updated_at' => $acc->updated_at ? $acc->updated_at->toIso8601String() : null,
                    'linkages' => $linkages,
                ]);
            }

            if ($acc->terms_document_url) {
                $accreditationDocs->push([
                    'id' => 'doc_accreditation_' . $acc->id . '_terms',
                    'real_id' => $acc->id,
                    'source_type' => 'accreditation',
                    'title' => 'Terms & Conditions - ' . $acc->entity_name,
                    'document_type' => 'agreement',
                    'file_path' => $acc->terms_document_url,
                    'amount' => null,
                    'custom_metadata' => array_merge($metadata, ['doc_type' => 'Terms']),
                    'uploaded_by' => null,
                    'created_at' => $acc->created_at ? $acc->created_at->toIso8601String() : null,
                    'updated_at' => $acc->updated_at ? $acc->updated_at->toIso8601String() : null,
                    'linkages' => $linkages,
                ]);
            }

            if ($acc->kyc_document_url) {
                $accreditationDocs->push([
                    'id' => 'doc_accreditation_' . $acc->id . '_kyc',
                    'real_id' => $acc->id,
                    'source_type' => 'accreditation',
                    'title' => 'Compliance KYC - ' . $acc->entity_name,
                    'document_type' => 'kyc',
                    'file_path' => $acc->kyc_document_url,
                    'amount' => null,
                    'custom_metadata' => array_merge($metadata, ['doc_type' => 'KYC']),
                    'uploaded_by' => null,
                    'created_at' => $acc->created_at ? $acc->created_at->toIso8601String() : null,
                    'updated_at' => $acc->updated_at ? $acc->updated_at->toIso8601String() : null,
                    'linkages' => $linkages,
                ]);
            }

            $customDocs = $acc->custom_documents ?? [];
            if (is_array($customDocs)) {
                foreach ($customDocs as $idx => $cDoc) {
                    if (empty($cDoc['url'])) continue;
                    $accreditationDocs->push([
                        'id' => 'doc_accreditation_' . $acc->id . '_custom_' . ($cDoc['key'] ?? $idx),
                        'real_id' => $acc->id,
                        'source_type' => 'accreditation',
                        'title' => ($cDoc['name'] ?? 'Custom Doc') . ' - ' . $acc->entity_name,
                        'document_type' => 'other',
                        'file_path' => $cDoc['url'],
                        'amount' => null,
                        'custom_metadata' => array_merge($metadata, ['doc_type' => $cDoc['name'] ?? 'Custom']),
                        'uploaded_by' => null,
                        'created_at' => $acc->created_at ? $acc->created_at->toIso8601String() : null,
                        'updated_at' => $acc->updated_at ? $acc->updated_at->toIso8601String() : null,
                        'linkages' => $linkages,
                    ]);
                }
            }
        });

        // 5. Fetch Passport Case Documents
        $passportCaseDocs = \App\Models\PassportCaseDocument::with(['customer', 'passportCase'])->get()->map(function ($caseDoc) {
            $case = $caseDoc->passportCase;
            $typeLabel = ($case && $case->case_type === 'passport') ? 'Passport' : 'Visa';
            return [
                'id' => 'doc_case_' . $caseDoc->id,
                'real_id' => $caseDoc->id,
                'source_type' => 'passport_case_document',
                'title' => '[' . $typeLabel . ' Case #' . $caseDoc->passport_case_id . '] ' . $caseDoc->title,
                'document_type' => strtolower($typeLabel),
                'file_path' => $caseDoc->file_path,
                'amount' => null,
                'custom_metadata' => [
                    'passport_case_id' => $caseDoc->passport_case_id,
                    'case_type' => $case ? $case->case_type : null,
                ],
                'uploaded_by' => $caseDoc->uploader ? [
                    'id' => $caseDoc->uploader->id,
                    'first_name' => $caseDoc->uploader->first_name,
                    'last_name' => $caseDoc->uploader->last_name,
                    'email' => $caseDoc->uploader->email,
                ] : null,
                'created_at' => $caseDoc->created_at ? $caseDoc->created_at->toIso8601String() : null,
                'updated_at' => $caseDoc->updated_at ? $caseDoc->updated_at->toIso8601String() : null,
                'customer_id' => $caseDoc->customer_id,
                'customer' => $caseDoc->customer,
                'linkages' => [
                    'customer' => $caseDoc->customer,
                    'connected_to' => ($case ? ($typeLabel . ' Case #' . $caseDoc->passport_case_id) : 'Unlinked') . ($caseDoc->customer ? (' — Customer: ' . $caseDoc->customer->first_name . ' ' . $caseDoc->customer->last_name) : ''),
                ]
            ];
        });

        // 6. Consolidate Collections
        $allDocs = collect()
            ->concat($procurementDocs)
            ->concat($kycDocs)
            ->concat($passportDocs)
            ->concat($visaDocs)
            ->concat($passportCaseDocs)
            ->concat($accreditationDocs);

        // 7. Filtering & Search
        if ($request->has('supplier_id')) {
            $supplierId = (int) $request->supplier_id;
            $allDocs = $allDocs->filter(function ($doc) use ($supplierId) {
                return isset($doc['supplier_id']) && $doc['supplier_id'] === $supplierId;
            });
        }
        if ($request->has('inventory_item_id')) {
            $itemId = (int) $request->inventory_item_id;
            $allDocs = $allDocs->filter(function ($doc) use ($itemId) {
                return isset($doc['inventory_item_id']) && $doc['inventory_item_id'] === $itemId;
            });
        }
        if ($request->has('driver_id')) {
            $driverId = (int) $request->driver_id;
            $allDocs = $allDocs->filter(function ($doc) use ($driverId) {
                return isset($doc['driver_id']) && $doc['driver_id'] === $driverId;
            });
        }

        // Role-based document category filtering
        $user = auth()->user();
        if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
            $disallowedSlugs = \App\Models\DocumentCategory::all()
                ->filter(function ($cat) use ($user) {
                    return !is_null($cat->allowed_roles) && !in_array($user->role, $cat->allowed_roles);
                })
                ->pluck('slug')
                ->toArray();
            
            $allDocs = $allDocs->filter(function ($doc) use ($disallowedSlugs) {
                return !in_array($doc['document_type'], $disallowedSlugs);
            });
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $allDocs = $allDocs->filter(function ($doc) use ($search) {
                if (str_contains(strtolower($doc['title']), $search)) return true;
                if (str_contains(strtolower($doc['document_type']), $search)) return true;
                if (str_contains(strtolower($doc['linkages']['connected_to'] ?? ''), $search)) return true;
                return false;
            });
        }

        // Sort chronologically (descending)
        $allDocs = $allDocs->sortByDesc('created_at')->values();

        return response()->json([
            'success' => true,
            'data' => $allDocs
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
            'file' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', // Max 10MB standard file (C-01: restrict types)
            'file_base64' => 'nullable|string',   // Or Base64 encoded payload
            'amount' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'inventory_item_id' => 'nullable|exists:inventory_items,id',
            'driver_id' => 'nullable|exists:users,id',
            'customer_id' => 'nullable|exists:customers,id',
            'job_order_id' => 'nullable|exists:job_orders,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'trip_ticket_id' => 'nullable|exists:trip_tickets,id',
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
            // C-01: use the server-resolved extension, not the client-supplied original name.
            $extension = strtolower($file->extension() ?: $file->getClientOriginalExtension());
            $fileName = 'procurement/docs/' . Str::random(20) . '.' . $extension;
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
            'customer_id' => $request->customer_id,
            'job_order_id' => $request->job_order_id,
            'work_order_id' => $request->work_order_id,
            'trip_ticket_id' => $request->trip_ticket_id,
            'transaction_type' => $request->transaction_type,
            'transaction_id' => $request->transaction_id,
            'custom_metadata' => $request->custom_metadata ?? [],
            'uploaded_by' => auth()->id() ?? 1, // Fallback to super_admin/system_user ID for test coverage
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Procurement document uploaded and linked successfully',
            'data' => $document->load(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email', 'customer:id,first_name,last_name,email', 'jobOrder', 'workOrder', 'tripTicket'])
        ], 201);
    }

    /**
     * Display details of a specific document.
     */
    public function show($id)
    {
        $document = ProcurementDocument::with(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email', 'uploader:id,first_name,last_name,email', 'customer:id,first_name,last_name,email', 'jobOrder', 'workOrder', 'tripTicket'])->find($id);

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
            'customer_id' => 'nullable|exists:customers,id',
            'job_order_id' => 'nullable|exists:job_orders,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'trip_ticket_id' => 'nullable|exists:trip_tickets,id',
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
            'customer_id' => $request->customer_id,
            'job_order_id' => $request->job_order_id,
            'work_order_id' => $request->work_order_id,
            'trip_ticket_id' => $request->trip_ticket_id,
            'transaction_type' => $request->transaction_type,
            'transaction_id' => $request->transaction_id,
            'custom_metadata' => $request->custom_metadata ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Procurement document references updated successfully',
            'data' => $document->load(['supplier', 'inventoryItem', 'driver:id,first_name,last_name,email', 'customer:id,first_name,last_name,email', 'jobOrder', 'workOrder', 'tripTicket'])
        ]);
    }

    /**
     * Clean up database records and disk storage file.
     */
    public function destroy($id)
    {
        if (is_string($id) && str_starts_with($id, 'doc_')) {
            // C-02: confidential customer/compliance documents (KYC, passport, visa, accreditation)
            // must only be deletable by roles that legitimately manage them — not any authenticated user.
            $confidentialPrefixes = ['doc_kyc_', 'doc_passport_', 'doc_visa_', 'doc_accreditation_'];
            foreach ($confidentialPrefixes as $prefix) {
                if (str_starts_with($id, $prefix)) {
                    $authUser = auth()->user();
                    $allowedRoles = ['super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer', 'office_staff', 'corporate_secretary'];
                    if (!$authUser || !in_array($authUser->role, $allowedRoles)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unauthorized. You do not have permission to delete this document.'
                        ], 403);
                    }
                    break;
                }
            }

            if (str_starts_with($id, 'doc_procurement_')) {
                $realId = (int) str_replace('doc_procurement_', '', $id);
                $document = ProcurementDocument::findOrFail($realId);
                $user = auth()->user();
                if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
                    if ($document->uploaded_by !== $user->id) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unauthorized. You can only delete documents that you uploaded.'
                        ], 403);
                    }
                }
                if (Storage::disk('public')->exists($document->file_path)) {
                    Storage::disk('public')->delete($document->file_path);
                }
                $document->delete();
            } 
            elseif (str_starts_with($id, 'doc_kyc_')) {
                $realId = (int) str_replace('doc_kyc_', '', $id);
                $kyc = CustomerKyc::findOrFail($realId);
                if ($kyc->file_path && Storage::disk('public')->exists($kyc->file_path)) {
                    Storage::disk('public')->delete($kyc->file_path);
                }
                $kyc->delete();
            } 
            elseif (str_starts_with($id, 'doc_passport_')) {
                $realId = (int) str_replace('doc_passport_', '', $id);
                $passport = CustomerPassport::findOrFail($realId);
                if ($passport->file_path && Storage::disk('public')->exists($passport->file_path)) {
                    Storage::disk('public')->delete($passport->file_path);
                }
                $passport->delete();
            } 
            elseif (str_starts_with($id, 'doc_visa_')) {
                $realId = (int) str_replace('doc_visa_', '', $id);
                $visa = CustomerVisa::findOrFail($realId);
                if ($visa->file_path && Storage::disk('public')->exists($visa->file_path)) {
                    Storage::disk('public')->delete($visa->file_path);
                }
                $visa->delete();
            } 
            elseif (str_starts_with($id, 'doc_case_')) {
                $realId = (int) str_replace('doc_case_', '', $id);
                $caseDoc = \App\Models\PassportCaseDocument::findOrFail($realId);
                $user = auth()->user();
                if ($user && !in_array($user->role, ['super_admin', 'executive_vice_president'])) {
                    if ($caseDoc->uploaded_by !== $user->id) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unauthorized. You can only delete documents that you uploaded.'
                        ], 403);
                    }
                }
                if ($caseDoc->file_path && Storage::disk('public')->exists($caseDoc->file_path)) {
                    Storage::disk('public')->delete($caseDoc->file_path);
                }
                $passportCase = $caseDoc->passportCase;
                if ($passportCase) {
                    $checklist = $passportCase->checklist ?? [];
                    $matchedKey = null;
                    foreach (array_keys($checklist) as $key) {
                        if (strtolower(trim($key)) === strtolower(trim($caseDoc->title))) {
                            $matchedKey = $key;
                            break;
                        }
                    }
                    if ($matchedKey) {
                        $checklist[$matchedKey] = false;
                        $passportCase->update(['checklist' => $checklist]);
                    }
                }
                $caseDoc->delete();
            } 
            elseif (str_starts_with($id, 'doc_accreditation_')) {
                $parts = explode('_', $id);
                $realId = (int) $parts[2];
                $type = $parts[3];
                
                $acc = Accreditation::findOrFail($realId);
                
                if ($type === 'main') {
                    $filePath = $this->getRelativePathFromUrl($acc->document_url);
                    if ($filePath && Storage::disk('public')->exists($filePath)) {
                        Storage::disk('public')->delete($filePath);
                    }
                    $acc->document_url = null;
                } elseif (in_array($type, ['kyc', 'nda', 'terms'])) {
                    $column = $type . '_document_url';
                    $filePath = $this->getRelativePathFromUrl($acc->{$column});
                    if ($filePath && Storage::disk('public')->exists($filePath)) {
                        Storage::disk('public')->delete($filePath);
                    }
                    $acc->{$column} = null;
                } elseif ($type === 'custom') {
                    $customKey = implode('_', array_slice($parts, 4));
                    $customDocs = $acc->custom_documents ?? [];
                    if (is_array($customDocs)) {
                        foreach ($customDocs as &$cDoc) {
                            if (($cDoc['key'] ?? '') === $customKey) {
                                $filePath = $this->getRelativePathFromUrl($cDoc['url']);
                                if ($filePath && Storage::disk('public')->exists($filePath)) {
                                    Storage::disk('public')->delete($filePath);
                                }
                                $cDoc['url'] = null;
                                $cDoc['status'] = 'pending';
                                break;
                            }
                        }
                        $acc->custom_documents = $customDocs;
                    }
                }
                $acc->save();
            }
        } else {
            // Fallback for raw numeric ID
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
            if (Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }
            $document->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Document and storage file deleted successfully'
        ]);
    }

    /**
     * Helper to get relative path from a full URL.
     */
    private function getRelativePathFromUrl($url)
    {
        if (!$url) return null;
        $storagePrefix = '/storage/';
        $pos = strpos($url, $storagePrefix);
        if ($pos !== false) {
            return substr($url, $pos + strlen($storagePrefix));
        }
        $pos2 = strpos($url, 'storage/');
        if ($pos2 !== false) {
            return substr($url, $pos2 + strlen('storage/'));
        }
        return $url;
    }
}
