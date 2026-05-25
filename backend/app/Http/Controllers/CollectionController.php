<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{
    public function index()
    {
        return Collection::with('payments')->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => 'required|string',
            'date' => 'required|date',
            'travel_date' => 'required|date',
            'pick_up' => 'nullable|string',
            'drop_off' => 'nullable|string',
            'rate' => 'nullable|numeric',
            'customer_id' => 'nullable|exists:customers,id',
            'payments' => 'nullable|array',
            'payments.*.payment_date' => 'required|date',
            'payments.*.payment_method' => 'required|string',
            'payments.*.amount' => 'required|numeric',
            'payments.*.balance' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($validated) {
            $collection = Collection::create(collect($validated)->except('payments')->toArray());

            if (!empty($validated['payments'])) {
                foreach ($validated['payments'] as $payment) {
                    $collection->payments()->create($payment);
                }
            }

            return $collection->load('payments');
        });
    }

    public function show($id)
    {
        return Collection::with('payments')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);
        
        $validated = $request->validate([
            'client_name' => 'sometimes|string',
            'date' => 'sometimes|date',
            'travel_date' => 'sometimes|date',
            'pick_up' => 'sometimes|string',
            'drop_off' => 'sometimes|string',
            'rate' => 'sometimes|numeric',
            'status' => 'sometimes|in:open,completed',
            'payments' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request, $collection, $validated) {
            $collection->update(collect($validated)->except('payments')->toArray());

            // If payments are explicitly provided, we replace the existing ones.
            // A more robust app might only add new payments, but for this form we just sync.
            if ($request->has('payments')) {
                $collection->payments()->delete();
                foreach ($validated['payments'] as $payment) {
                    $collection->payments()->create($payment);
                }
            }

            return $collection->load('payments');
        });
    }

    public function destroy($id)
    {
        Collection::findOrFail($id)->delete();
        return response()->json(['message' => 'Collection deleted successfully.']);
    }
}
