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

    public function store(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'passport_number' => 'required|string|max:255',
            'issue_country'   => 'nullable|string|max:255',
            'issue_date'      => 'nullable|date',
            'expiry_date'     => 'nullable|date',
            'file_path'       => 'nullable|string',
            'notes'           => 'nullable|string',
        ]);

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
