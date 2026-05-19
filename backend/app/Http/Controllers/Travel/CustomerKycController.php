<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerKyc;
use Illuminate\Http\Request;

class CustomerKycController extends Controller
{
    public function index(Customer $customer)
    {
        return response()->json($customer->kycs()->latest()->get());
    }

    public function store(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'document_type'   => 'required|string|max:255',
            'document_number' => 'nullable|string|max:255',
            'file_path'       => 'nullable|string',
            'notes'           => 'nullable|string',
        ]);

        $kyc = $customer->kycs()->create($validated);

        return response()->json($kyc, 201);
    }

    public function destroy(Customer $customer, CustomerKyc $kyc)
    {
        if ($kyc->customer_id !== $customer->id) {
            abort(404);
        }
        
        $kyc->delete();
        return response()->json(null, 204);
    }
}
