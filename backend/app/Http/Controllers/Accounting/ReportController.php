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
        $kpiQuery = Invoice::whereIn('status', ['paid', 'partial']);
        if ($startDate) {
            $kpiQuery->where('created_at', '>=', $startDate);
        }
        $totalRevenue = (float) $kpiQuery->sum('total_amount');
        $transactionCount = $kpiQuery->count();
        $averageTicketSize = $transactionCount > 0 ? $totalRevenue / $transactionCount : 0;
        
        // Expenses Calculation
        $expenseQuery = Invoice::where('status', 'disbursed_budget');
        if ($startDate) {
            $expenseQuery->where('created_at', '>=', $startDate);
        }
        $totalExpenses = (float) $expenseQuery->sum('total_amount');
        
        $poQuery = \App\Models\PurchaseOrder::whereIn('status', ['approved', 'completed', 'delivered']);
        if ($startDate) {
            $poQuery->where('created_at', '>=', $startDate);
        }
        $totalPoExpenses = (float) $poQuery->sum('total_amount');

        $overallExpenses = $totalExpenses + $totalPoExpenses;
        $profitMargin = $totalRevenue > 0 ? ($totalRevenue - $overallExpenses) / $totalRevenue : 0;
        
        // Revenue Trend (Dynamic grouping and filtering based on range)
        $trendQuery = Invoice::select(
                DB::raw("{$trendFormat} as date"),
                DB::raw('SUM(total_amount) as total')
            )
            ->whereIn('status', ['paid', 'partial']);

        if ($startDate) {
            $trendQuery->where('created_at', '>=', $startDate);
        } else {
            // For 'all' range, group by month
            $trendFormat = "TO_CHAR(created_at, 'YYYY-MM-01')";
            $trendQuery = Invoice::select(
                DB::raw("{$trendFormat} as date"),
                DB::raw('SUM(total_amount) as total')
            )->whereIn('status', ['paid', 'partial']);
        }

        $trend = $trendQuery->groupBy('date')
            ->orderBy('date')
            ->get();

        // Service Category Breakdown (Dynamic filtering based on range)
        $categoryQuery = DB::table('invoice_items')
            ->join('services', 'invoice_items.service_id', '=', 'services.id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereIn('invoices.status', ['paid', 'partial']);

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
                    'expenses' => $overallExpenses,
                    'transactions' => $transactionCount,
                    'avg_ticket' => $averageTicketSize,
                    'profit_margin' => $profitMargin,
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

        $query = Invoice::with(['customer', 'items.service', 'creator'])->whereIn('status', ['paid', 'partial']);
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
