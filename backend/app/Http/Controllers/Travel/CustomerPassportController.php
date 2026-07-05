<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPassport;
use Illuminate\Http\Request;

class CustomerPassportController extends Controller
{
    public function index(Customer $customer)
    {
        return response()->json($customer->passports()->latest()->get());
    }

    public function store(\App\Http\Requests\Travel\StoreCustomerPassportRequest $request, Customer $customer)
    {
        $validated = $request->validated();

        $passport = $customer->passports()->create($validated);

        return response()->json($passport, 201);
    }

    public function destroy(Customer $customer, CustomerPassport $passport)
    {
        if ($passport->customer_id !== $customer->id) {
            abort(404);
        }
        
        $passport->delete();
        return response()->json(null, 204);
    }
}
