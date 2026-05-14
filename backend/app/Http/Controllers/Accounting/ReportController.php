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
        $range = $request->range ?? 'month'; // month, year, all
        $query = Invoice::where('status', 'paid');

        if ($range === 'day') {
            $query->where('created_at', '>=', Carbon::now()->startOfDay());
        } elseif ($range === 'week') {
            $query->where('created_at', '>=', Carbon::now()->startOfWeek());
        } elseif ($range === 'month') {
            $query->where('created_at', '>=', Carbon::now()->startOfMonth());
        } elseif ($range === 'year') {
            $query->where('created_at', '>=', Carbon::now()->startOfYear());
        }

        // KPIs
        $totalRevenue = $query->sum('total_amount');
        $transactionCount = $query->count();
        $averageTicketSize = $transactionCount > 0 ? $totalRevenue / $transactionCount : 0;
        
        // Growth (vs previous period)
        // For simplicity, let's just return current stats. 
        // In a real app, we'd calculate % change.

        // Revenue Trend (Daily for current month)
        $trend = Invoice::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('status', 'paid')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Service Category Breakdown
        $categories = DB::table('invoice_items')
            ->join('services', 'invoice_items.service_id', '=', 'services.id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.status', 'paid')
            ->select('services.category', DB::raw('SUM(invoice_items.total_price) as total'))
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
        $query = Invoice::with(['customer', 'items.service'])->where('status', 'paid');

        if ($range === 'day') {
            $query->where('created_at', '>=', Carbon::now()->startOfDay());
        } elseif ($range === 'week') {
            $query->where('created_at', '>=', Carbon::now()->startOfWeek());
        } elseif ($range === 'month') {
            $query->where('created_at', '>=', Carbon::now()->startOfMonth());
        } elseif ($range === 'year') {
            $query->where('created_at', '>=', Carbon::now()->startOfYear());
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }
}
