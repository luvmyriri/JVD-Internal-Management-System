<?php

namespace App\Http\Controllers\Fleet;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccreditationResource;
use App\Models\Accreditation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccreditationController extends Controller
{
    /**
     * List accreditations — filterable by entity_type, entity_id, status.
     * ?expiring_days=30 surfaces records expiring within N days.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Accreditation::query();

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->filled('entity_id')) {
            $query->where('entity_id', $request->entity_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Surface records expiring within X days (defaults to 30 if ?expiring_soon=true)
        if ($request->filled('expiring_days')) {
            $days = (int) $request->expiring_days;
            $query->whereBetween('expiry_date', [now()->toDateString(), now()->addDays($days)->toDateString()]);
        } elseif ($request->boolean('expiring_soon')) {
            $query->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(30)->toDateString()]);
        }

        $accreditations = $query->orderBy('expiry_date')
                                ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => AccreditationResource::collection($accreditations),
            'meta'    => [
                'current_page'     => $accreditations->currentPage(),
                'last_page'        => $accreditations->lastPage(),
                'per_page'         => $accreditations->perPage(),
                'total'            => $accreditations->total(),
                'expiring_30_days' => Accreditation::whereBetween('expiry_date', [
                    now()->toDateString(),
                    now()->addDays(30)->toDateString(),
                ])->count(),
            ],
        ]);
    }

    /**
     * Create a new accreditation record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity_type'        => ['required', 'in:company,driver,bus'],
            'entity_id'          => ['required', 'integer'],
            'accreditation_type' => ['required', 'string', 'max:100'],
            'issuing_body'       => ['required', 'string', 'max:150'],
            'issue_date'         => ['required', 'date'],
            'expiry_date'        => ['required', 'date', 'after:issue_date'],
            'document_url'       => ['nullable', 'string', 'max:500'],
        ]);

        $accreditation = Accreditation::create(array_merge($validated, ['status' => 'active']));

        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation),
            'message' => 'Accreditation recorded successfully.',
        ], 201);
    }

    /**
     * Get a single accreditation record.
     */
    public function show(Accreditation $accreditation): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation),
        ]);
    }

    /**
     * Update accreditation record (e.g., renewal, status change).
     */
    public function update(Request $request, Accreditation $accreditation): JsonResponse
    {
        $validated = $request->validate([
            'accreditation_type' => ['sometimes', 'string', 'max:100'],
            'issuing_body'       => ['sometimes', 'string', 'max:150'],
            'issue_date'         => ['sometimes', 'date'],
            'expiry_date'        => ['sometimes', 'date', 'after:issue_date'],
            'status'             => ['sometimes', 'in:active,expired,pending_renewal'],
            'document_url'       => ['nullable', 'string', 'max:500'],
        ]);

        $accreditation->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new AccreditationResource($accreditation->fresh()),
            'message' => 'Accreditation updated.',
        ]);
    }
}
