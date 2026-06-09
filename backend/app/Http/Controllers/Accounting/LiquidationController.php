<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Liquidation;
use App\Services\LiquidationService;
use Illuminate\Http\Request;

class LiquidationController extends Controller
{
    protected LiquidationService $service;

    public function __construct(LiquidationService $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        $liquidations = Liquidation::with(['items', 'tripTicket', 'employee'])->get();
        return response()->json(['success' => true, 'data' => $liquidations]);
    }

    public function show(Liquidation $liquidation)
    {
        $liquidation->load(['items', 'tripTicket', 'employee']);
        return response()->json(['success' => true, 'data' => $liquidation]);
    }

    public function settle(Request $request, Liquidation $liquidation)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.expense_category' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0',
            'total_returned' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $settled = $this->service->settleLiquidation(
            $liquidation, 
            $request->items, 
            $request->total_returned, 
            $request->notes
        );

        return response()->json(['success' => true, 'data' => $settled]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
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
}
