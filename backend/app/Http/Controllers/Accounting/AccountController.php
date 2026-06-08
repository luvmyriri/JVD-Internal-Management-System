<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $accounts = Account::all();
        return response()->json(['success' => true, 'data' => $accounts]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    public function employeeSoa()
    {
        $employees = \App\Models\User::whereHas('liquidations')
            ->orWhereIn('role', ['driver', 'logistics_in_charge', 'dispatcher'])
            ->with(['liquidations.items', 'liquidations.tripTicket'])
            ->get()
            ->map(function ($employee) {
                $liquidations = $employee->liquidations;
                
                $totalAdvanced = $liquidations->sum('total_advanced');
                $totalSpent = $liquidations->sum('total_spent');
                $totalReturned = $liquidations->sum('total_returned');
                $shortageAmount = $liquidations->sum('shortage_amount');
                
                return [
                    'id' => $employee->id,
                    'first_name' => $employee->first_name,
                    'last_name' => $employee->last_name,
                    'employee_id' => $employee->employee_id,
                    'email' => $employee->email,
                    'role' => $employee->role,
                    'total_advanced' => (float)$totalAdvanced,
                    'total_spent' => (float)$totalSpent,
                    'total_returned' => (float)$totalReturned,
                    'shortage_amount' => (float)$shortageAmount,
                    'liquidations_count' => $liquidations->count(),
                    'liquidations' => $liquidations,
                ];
            })
            ->values();

        return response()->json(['success' => true, 'data' => $employees]);
    }
}
