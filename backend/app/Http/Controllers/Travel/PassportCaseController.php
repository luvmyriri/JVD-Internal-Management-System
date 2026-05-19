<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePassportCaseRequest;
use App\Http\Resources\PassportCaseResource;
use App\Models\PassportCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        if (!$user->hasRole('super_admin', 'admin')) {
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
        $case = PassportCase::create(array_merge($request->validated(), [
            'handled_by' => $request->user()->id,
            'status'     => 'requirements_gathering',
        ]));

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

        $passportCase->update($validated);

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

        $passportCase->update(['status' => $newStatus]);

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

        $passportCase->update(['checklist' => $request->checklist]);

        return response()->json([
            'success' => true,
            'data'    => new PassportCaseResource($passportCase->fresh(['customer', 'passenger', 'handler'])),
            'message' => 'Checklist updated.',
        ]);
    }
}
