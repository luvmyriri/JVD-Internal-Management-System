<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Accreditation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OverviewController extends Controller
{
    public function getStats(): JsonResponse
    {
        // Total Active POs (not draft or rejected)
        $activePos = PurchaseOrder::whereNotIn('status', ['draft', 'rejected'])->count();

        // Total Suppliers (accredited)
        $totalSuppliers = Supplier::where('accreditation_status', 'accredited')->count();

        // Pending POs
        $pendingPos = PurchaseOrder::whereIn('status', ['pending_accounting_review', 'pending_ceo_approval'])->count();

        // Pending KYC / Accreditations
        $pendingAccreditations = Accreditation::whereIn('status', ['pending_kyc', 'pending_review'])->count();

        // Active Accreditations
        $activeAccreditations = Accreditation::where('status', 'accredited')->count();

        // Order Volume (last 4 weeks)
        $weeklyVolume = collect(range(0, 3))->map(function ($weeksAgo) {
            $start = Carbon::now()->subWeeks($weeksAgo)->startOfWeek();
            $end = Carbon::now()->subWeeks($weeksAgo)->endOfWeek();
            
            $count = PurchaseOrder::whereBetween('created_at', [$start, $end])
                        ->whereNotIn('status', ['draft', 'rejected'])
                        ->count();
                        
            return [
                'name' => 'W' . (4 - $weeksAgo), // W1 to W4
                'pos' => $count
            ];
        })->reverse()->values();

        // Top Suppliers (Distribution)
        $topSuppliers = PurchaseOrder::select('supplier_id', DB::raw('count(*) as value'))
            ->whereNotIn('status', ['draft', 'rejected'])
            ->groupBy('supplier_id')
            ->with('supplier:id,company_name')
            ->orderByDesc('value')
            ->limit(4)
            ->get()
            ->map(function ($po) {
                return [
                    'name' => $po->supplier ? $po->supplier->company_name : 'Unknown',
                    'value' => $po->value
                ];
            });

        // Fallback for empty distribution
        if ($topSuppliers->isEmpty()) {
            $topSuppliers = [
                ['name' => 'No Data', 'value' => 1]
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'active_pos' => $activePos,
                    'total_suppliers' => $totalSuppliers,
                    'pending_pos' => $pendingPos,
                    'pending_accreditations' => $pendingAccreditations,
                    'active_accreditations' => $activeAccreditations,
                ],
                'volume' => $weeklyVolume,
                'distribution' => $topSuppliers
            ]
        ]);
    }
}
