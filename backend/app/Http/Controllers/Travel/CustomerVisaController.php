<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerVisa;
use Illuminate\Http\Request;

class CustomerVisaController extends Controller
{
    public function index(Customer $customer)
    {
        return response()->json($customer->visas()->latest()->get());
    }

    public function store(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'country'      => 'required|string|max:255',
            'visa_type'    => 'nullable|string|max:255',
            'visa_number'  => 'required|string|max:255',
            'issue_date'   => 'nullable|date',
            'expiry_date'  => 'nullable|date',
            'file_path'    => 'nullable|string',
            'notes'        => 'nullable|string',
        ]);

        $visa = $customer->visas()->create($validated);

        return response()->json($visa, 201);
    }

    public function destroy(Customer $customer, CustomerVisa $visa)
    {
        if ($visa->customer_id !== $customer->id) {
            abort(404);
        }
        
        $visa->delete();
        return response()->json(null, 204);
    }
}
