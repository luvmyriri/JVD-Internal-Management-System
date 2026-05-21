<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * List customers — searchable by name, email, or phone.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('last_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('email', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('last_name')
                           ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => CustomerResource::collection($customers)->resolve(),
            'meta'    => [
                'current_page' => $customers->currentPage(),
                'last_page'    => $customers->lastPage(),
                'per_page'     => $customers->perPage(),
                'total'        => $customers->total(),
            ],
        ]);
    }

    /**
     * Create a new customer.
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create($request->validated());

        return response()->json([
            'success' => true,
            'data'    => new CustomerResource($customer),
            'message' => 'Customer created successfully.',
        ], 201);
    }

    /**
     * Get a single customer with their passengers.
     */
    public function show(Customer $customer): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new CustomerResource($customer->load(['passengers', 'invoices', 'passports', 'visas', 'kycs', 'tasks'])),
        ]);
    }

    /**
     * Update customer details.
     */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name'  => ['sometimes', 'string', 'max:100'],
            'email'      => ['required', 'email', 'max:255'],
            'phone'      => ['required', 'string', 'max:30', 'regex:/^(?:\+63|63|0)[\s-]*9(?:[\s-]*\d){9}$/'],
            'address'    => ['nullable', 'string', 'max:500'],
            'notes'      => ['nullable', 'string', 'max:1000'],
        ], [
            'phone.regex' => 'The phone number must be a valid Philippine mobile number (e.g. 09171234567 or +639171234567).',
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new CustomerResource($customer->fresh()),
            'message' => 'Customer updated successfully.',
        ]);
    }
}
