<?php

namespace App\Http\Controllers;

use App\Models\CashBudgetRequest;
use Illuminate\Http\Request;

class CashBudgetRequestController extends Controller
{
    public function index()
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy'])->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'travel_date' => 'required|date',
            'plate_number' => 'nullable|string',
            'destination' => 'required|string',
            'diesel' => 'nullable|numeric',
            'meal_allowance' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',
            'easytrip' => 'nullable|numeric',
            'coach_captain_salary' => 'nullable|numeric',
            'spare_driver_salary' => 'nullable|numeric',
        ]);

        $validated['prepared_by'] = auth()->id();
        $validated['total_amount'] = collect($validated)->only([
            'diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'
        ])->sum();
        
        $budget = CashBudgetRequest::create($validated);
        
        return $budget->load(['preparedBy', 'approvedBy']);
    }

    public function show($id)
    {
        return CashBudgetRequest::with(['preparedBy', 'approvedBy'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $budget = CashBudgetRequest::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,approved,disbursed',
            'diesel' => 'sometimes|numeric',
            'meal_allowance' => 'sometimes|numeric',
            'sop' => 'sometimes|numeric',
            'autosweep' => 'sometimes|numeric',
            'easytrip' => 'sometimes|numeric',
            'coach_captain_salary' => 'sometimes|numeric',
            'spare_driver_salary' => 'sometimes|numeric',
        ]);

        // If any amounts are updated, recalculate total
        $amounts = ['diesel', 'meal_allowance', 'sop', 'autosweep', 'easytrip', 'coach_captain_salary', 'spare_driver_salary'];
        $needsRecalculation = false;
        foreach ($amounts as $amount) {
            if ($request->has($amount)) {
                $needsRecalculation = true;
                break;
            }
        }

        $budget->update($validated);

        if ($needsRecalculation) {
            $budget->update([
                'total_amount' => $budget->only($amounts) ? collect($budget->only($amounts))->sum() : 0
            ]);
        }

        if ($request->has('status') && $request->status === 'approved') {
            $budget->update(['approved_by' => auth()->id()]);
        }

        return $budget->load(['preparedBy', 'approvedBy']);
    }

    public function destroy($id)
    {
        CashBudgetRequest::findOrFail($id)->delete();
        return response()->json(['message' => 'Cash budget request deleted successfully.']);
    }
}
