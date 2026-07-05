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

    public function store(\App\Http\Requests\Travel\StoreCustomerVisaRequest $request, Customer $customer)
    {
        $validated = $request->validated();

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
