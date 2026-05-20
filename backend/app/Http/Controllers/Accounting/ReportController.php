<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Get financial summary for reports.
     */
    public function getSummary(Request $request)
    {
        $range = $request->range ?? 'month'; // day, week, month, year, all
        $now = Carbon::now();
        $startDate = null;
        $trendFormat = "CAST(created_at AS date)";

        if ($range === 'day') {
            $startDate = $now->copy()->startOfDay();
            $trendFormat = "TO_CHAR(created_at, 'YYYY-MM-DD HH24:00:00')";
        } elseif ($range === 'week') {
            $startDate = $now->copy()->startOfWeek();
            $trendFormat = "CAST(created_at AS date)";
        } elseif ($range === 'month') {
            $startDate = $now->copy()->startOfMonth();
            $trendFormat = "CAST(created_at AS date)";
        } elseif ($range === 'year') {
            $startDate = $now->copy()->startOfYear();
            $trendFormat = "TO_CHAR(created_at, 'YYYY-MM-01')";
        }

        // KPIs (Independent query builder instance to avoid query reuse pollution)
        $kpiQuery = Invoice::where('status', 'paid');
        if ($startDate) {
            $kpiQuery->where('created_at', '>=', $startDate);
        }
        $totalRevenue = (float) $kpiQuery->sum('total_amount');
        $transactionCount = $kpiQuery->count();
        $averageTicketSize = $transactionCount > 0 ? $totalRevenue / $transactionCount : 0;
        
        // Revenue Trend (Dynamic grouping and filtering based on range)
        $trendQuery = Invoice::select(
                DB::raw("{$trendFormat} as date"),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('status', 'paid');

        if ($startDate) {
            $trendQuery->where('created_at', '>=', $startDate);
        } else {
            // For 'all' range, group by month
            $trendFormat = "TO_CHAR(created_at, 'YYYY-MM-01')";
            $trendQuery = Invoice::select(
                DB::raw("{$trendFormat} as date"),
                DB::raw('SUM(total_amount) as total')
            )->where('status', 'paid');
        }

        $trend = $trendQuery->groupBy('date')
            ->orderBy('date')
            ->get();

        // Service Category Breakdown (Dynamic filtering based on range)
        $categoryQuery = DB::table('invoice_items')
            ->join('services', 'invoice_items.service_id', '=', 'services.id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.status', 'paid');

        if ($startDate) {
            $categoryQuery->where('invoices.created_at', '>=', $startDate);
        }

        $categories = $categoryQuery->select('services.category', DB::raw('SUM(invoice_items.total_price) as total'))
            ->groupBy('services.category')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'revenue' => $totalRevenue,
                    'transactions' => $transactionCount,
                    'avg_ticket' => $averageTicketSize,
                    'profit_margin' => 0.15, // Mock margin
                ],
                'trend' => $trend,
                'categories' => $categories
            ]
        ]);
    }

    /**
     * Get detailed invoice list for exports.
     */
    public function getDetailed(Request $request)
    {
        $range = $request->range ?? 'month';
        $now = Carbon::now();
        $startDate = null;

        if ($range === 'day') {
            $startDate = $now->copy()->startOfDay();
        } elseif ($range === 'week') {
            $startDate = $now->copy()->startOfWeek();
        } elseif ($range === 'month') {
            $startDate = $now->copy()->startOfMonth();
        } elseif ($range === 'year') {
            $startDate = $now->copy()->startOfYear();
        }

        $query = Invoice::with(['customer', 'items.service'])->where('status', 'paid');
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }
}
