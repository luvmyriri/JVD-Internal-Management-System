<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $query = Collection::with(['payments', 'invoice', 'customer']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('client_name', 'like', "%$search%")
                  ->orWhere('service_type', 'like', "%$search%")
                  ->orWhereHas('invoice', function($iq) use ($search) {
                      $iq->where('invoice_number', 'like', "%$search%");
                  });
            });
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('collection_status', $request->status);
        }

        // Hide fully-settled (zero balance) records unless the user explicitly views 'completed'
        $isViewingCompleted = $request->has('status') && $request->status === 'completed';
        if (!$isViewingCompleted) {
            $query->where('remaining_balance', '>', 0);
        }

        $collections = $query->latest()->get();

        $stats = [
            'pending' => Collection::where('collection_status', 'pending')->count(),
            'partial' => Collection::where('collection_status', 'partial')->count(),
            'overdue' => Collection::where('collection_status', 'overdue')->count(),
            'completed' => Collection::where('collection_status', 'completed')
                ->whereMonth('updated_at', date('m'))
                ->whereYear('updated_at', date('Y'))
                ->count(),
        ];

        return response()->json([
            'data' => $collections,
            'stats' => $stats
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => 'required|string',
            'service_type' => 'nullable|string',
            'other_service_type' => 'nullable|string',
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
            $collectionData = collect($validated)->except('payments')->toArray();

            // Set default billing fields for manual collections so recalculate works perfectly!
            $collectionData['billing_amount'] = $validated['rate'] ?? 0;
            $collectionData['remaining_balance'] = $validated['rate'] ?? 0;
            $collectionData['due_date'] = $validated['travel_date'] ?? null;
            $collectionData['collection_status'] = 'pending';

            $collection = Collection::create($collectionData);

            if (!empty($validated['payments'])) {
                foreach ($validated['payments'] as $payment) {
                    $collection->payments()->create($payment);
                }
            }

            // Recalculate will populate paid_amount, remaining_balance, and status!
            $collection->recalculate();

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
            'service_type' => 'sometimes|nullable|string',
            'other_service_type' => 'sometimes|nullable|string',
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

    public function confirm($id)
    {
        $collection = Collection::findOrFail($id);

        $collection->update([
            'collection_status' => 'completed',
            'status'            => 'completed',
            'paid_amount'       => $collection->billing_amount,
            'remaining_balance' => 0,
        ]);

        // Sync the linked invoice to paid as well
        if ($collection->invoice_id) {
            $invoice = $collection->invoice;
            if ($invoice) {
                $invoice->update([
                    'status'          => 'paid',
                    'balance'         => 0,
                    'amount_received' => $invoice->total_amount,
                ]);
            }
        }

        return response()->json([
            'message' => 'Collection confirmed as fully paid.',
            'data'    => $collection->load('payments'),
        ]);
    }

    public function addPayment(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);
        
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $collection->payments()->create($validated);
        
        $collection->recalculate();

        return response()->json([
            'message' => 'Payment added successfully.',
            'data' => $collection->load('payments')
        ]);
    }

    public function updateRemarks(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);
        
        $validated = $request->validate([
            'remarks' => 'nullable|string',
        ]);

        $collection->update(['remarks' => $validated['remarks']]);

        return response()->json([
            'message' => 'Remarks updated.',
            'data' => $collection
        ]);
    }
}
