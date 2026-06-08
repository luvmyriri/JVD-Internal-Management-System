<?php

namespace App\Http\Controllers;

use App\Models\Commission;
use App\Models\CommissionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommissionController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $query = Commission::with(['items', 'receivedBy', 'releasedBy', 'approvedBy']);
        
        if ($user && $user->hasRole('driver')) {
            $query->where('received_by', $user->id);
        }
        
        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'commissioner_name' => 'required|string|max:255',
            'serial_no' => 'required|string|unique:commissions,serial_no',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.travel_date' => 'required|date',
            'items.*.destination' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $commission = Commission::create([
                'commissioner_name' => $validated['commissioner_name'],
                'serial_no' => $validated['serial_no'],
                'date' => $validated['date'],
                'status' => 'draft',
                'received_by' => auth()->user()?->hasRole('driver') ? auth()->id() : null,
            ]);

            foreach ($validated['items'] as $item) {
                $commission->items()->create($item);
            }

            return $commission->load('items');
        });
    }

    public function show($id)
    {
        return Commission::with(['items', 'receivedBy', 'releasedBy', 'approvedBy'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $commission = Commission::findOrFail($id);
        
        $validated = $request->validate([
            'commissioner_name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'status' => 'sometimes|in:draft,approved,released',
        ]);

        $commission->update($validated);

        if ($request->has('status')) {
            if ($request->status === 'approved') {
                $commission->update(['approved_by' => auth()->id()]);
            } elseif ($request->status === 'released') {
                $commission->update(['released_by' => auth()->id()]);
            }
        }

        return $commission->load(['items', 'receivedBy', 'releasedBy', 'approvedBy']);
    }

    public function destroy($id)
    {
        Commission::findOrFail($id)->delete();
        return response()->json(['message' => 'Commission deleted successfully.']);
    }
}
