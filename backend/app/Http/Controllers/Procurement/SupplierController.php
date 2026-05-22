<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * List all suppliers (searchable).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('contact_person', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('email', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('accreditation_status')) {
            $query->where('accreditation_status', $request->accreditation_status);
        }

        $suppliers = $query->orderBy('company_name')
                           ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => SupplierResource::collection($suppliers)->resolve(),
            'meta'    => [
                'current_page' => $suppliers->currentPage(),
                'last_page'    => $suppliers->lastPage(),
                'per_page'     => $suppliers->perPage(),
                'total'        => $suppliers->total(),
            ],
        ]);
    }

    /**
     * Create a new supplier.
     */
    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return response()->json([
            'success' => true,
            'data'    => new SupplierResource($supplier),
            'message' => 'Supplier created successfully.',
        ], 201);
    }

    /**
     * Get a single supplier.
     */
    public function show(Supplier $supplier): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new SupplierResource($supplier),
        ]);
    }

    /**
     * Update supplier details.
     */
    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'company_name'        => ['sometimes', 'string', 'max:255', 'unique:suppliers,company_name,' . $supplier->id],
            'contact_person'      => ['nullable', 'string', 'max:150'],
            'phone'               => ['nullable', 'string', 'max:30'],
            'email'               => ['nullable', 'email', 'max:255'],
            'address'             => ['nullable', 'string', 'max:500'],
            'payment_terms'       => ['nullable', 'string', 'max:500'],
            'is_consignment'      => ['sometimes', 'boolean'],
            'bank_name'           => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'tin_number'          => ['nullable', 'string', 'max:50'],
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new SupplierResource($supplier->fresh()),
            'message' => 'Supplier updated successfully.',
        ]);
    }

    /**
     * Accounting verifies/cross-checks a supplier.
     * Business Rule: Suppliers must be CROSS AND COUNTER CHECKED before
     * a PO can be issued against them. (Boss mandate)
     */
    public function verify(Request $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Supplier is already verified.',
            ], 422);
        }

        $supplier->update([
            'is_verified'          => true,
            'verified_by'          => $request->user()->id,
            'verified_at'          => now(),
            'accreditation_status' => 'accredited',
        ]);

        $supplier->accreditations()->updateOrCreate(
            [
                'accreditation_type' => 'Supplier Verification',
            ],
            [
                'issuing_body'   => 'JVD Management',
                'issue_date'     => now(),
                'expiry_date'    => now()->addYears(1),
                'status'         => 'active',
                'entity_name'    => $supplier->company_name,
                'contact_person' => $supplier->contact_person,
                'contact_email'  => $supplier->email,
            ]
        );

        return response()->json([
            'success' => true,
            'data'    => new SupplierResource($supplier->fresh(['accreditations'])),
            'message' => "Supplier '{$supplier->company_name}' verified and accredited.",
        ]);
    }

    /**
     * Blacklist a supplier (blocks new POs from being issued to them).
     */
    public function blacklist(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $supplier->update([
            'is_verified'          => false,
            'accreditation_status' => 'blacklisted',
        ]);

        $supplier->accreditations()->update([
            'status' => 'expired',
            'expiry_date' => now()
        ]);

        return response()->json([
            'success' => true,
            'data'    => new SupplierResource($supplier->fresh(['accreditations'])),
            'message' => "Supplier '{$supplier->company_name}' has been blacklisted. Reason: {$validated['reason']}",
        ]);
    }

    /**
     * Delete a supplier and their linked accreditations.
     */
    public function destroy(Supplier $supplier): JsonResponse
    {
        // Delete all associated accreditations
        $supplier->accreditations()->delete();

        // Delete the supplier
        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => "Supplier '{$supplier->company_name}' and all associated compliance records have been successfully deleted."
        ]);
    }
}
