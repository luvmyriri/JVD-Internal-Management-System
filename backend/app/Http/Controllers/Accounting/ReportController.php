<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Collection;
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
        $isPgsql = DB::getDriverName() === 'pgsql';

        if ($range === 'day') {
            $startDate = $now->copy()->startOfDay();
            $trendFormat = $isPgsql ? "TO_CHAR(created_at, 'YYYY-MM-DD HH24:00:00')" : "strftime('%Y-%m-%d %H:00:00', created_at)";
        } elseif ($range === 'week') {
            $startDate = $now->copy()->startOfWeek();
            $trendFormat = $isPgsql ? "CAST(created_at AS date)" : "strftime('%Y-%m-%d', created_at)";
        } elseif ($range === 'month') {
            $startDate = $now->copy()->startOfMonth();
            $trendFormat = $isPgsql ? "CAST(created_at AS date)" : "strftime('%Y-%m-%d', created_at)";
        } elseif ($range === 'year') {
            $startDate = $now->copy()->startOfYear();
            $trendFormat = $isPgsql ? "TO_CHAR(created_at, 'YYYY-MM-01')" : "strftime('%Y-%m-01', created_at)";
        } else {
            $trendFormat = $isPgsql ? "TO_CHAR(created_at, 'YYYY-MM-01')" : "strftime('%Y-%m-01', created_at)";
        }

        // KPIs (Independent query builder instance to avoid query reuse pollution)
        // Revenue is cash-basis: money actually collected, not the full invoiced
        // amount. See Invoice::COLLECTED_REVENUE_SQL / revenueBearing().
        $kpiQuery = Invoice::revenueBearing();
        if ($startDate) {
            $kpiQuery->where('created_at', '>=', $startDate);
        }
        $totalRevenue = (float) $kpiQuery->sum(Invoice::collectedRevenueExpr());
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
                DB::raw('SUM(' . Invoice::COLLECTED_REVENUE_SQL . ') as total')
            )
            ->revenueBearing();

        if ($startDate) {
            $trendQuery->where('created_at', '>=', $startDate);
        }

        $trend = $trendQuery->groupBy(DB::raw($trendFormat))
            ->orderBy('date')
            ->get();

        // Service Category Breakdown (Dynamic filtering based on range)
        $categoryQuery = DB::table('invoice_items')
            ->leftJoin('services', 'invoice_items.service_id', '=', 'services.id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereIn('invoices.status', ['paid', 'partial']);

        if ($startDate) {
            $categoryQuery->where('invoices.created_at', '>=', $startDate);
        }

        $categoryExpression = "COALESCE(services.category, invoice_items.service_type, 'Custom arrangement')";
        $categories = $categoryQuery->selectRaw("{$categoryExpression} as category, SUM(invoice_items.total_price) as total")
            ->groupByRaw($categoryExpression)
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

        $query = Invoice::with(['customer', 'items.service', 'creator'])
            ->where(function ($q) {
                $q->whereIn('status', ['paid', 'partial'])
                    ->orWhere('amount_received', '>', 0);
            })
            ->whereNull('cash_budget_request_id');
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    public function reconciliation(Request $request)
    {
        $mismatches = [];

        $collections = Collection::whereNotNull('invoice_id')
            ->with('invoice')
            ->get();

        foreach ($collections as $collection) {
            $invoice = $collection->invoice;
            if (!$invoice) continue;

            $issues = [];

            if (abs((float) $collection->billing_amount - (float) $invoice->total_amount) > 0.01) {
                $issues[] = [
                    'field' => 'billing_amount vs total_amount',
                    'collection_value' => (float) $collection->billing_amount,
                    'invoice_value' => (float) $invoice->total_amount,
                ];
            }

            if (abs((float) $collection->remaining_balance - (float) $invoice->balance) > 0.01) {
                $issues[] = [
                    'field' => 'remaining_balance vs balance',
                    'collection_value' => (float) $collection->remaining_balance,
                    'invoice_value' => (float) $invoice->balance,
                ];
            }

            if (abs((float) $collection->paid_amount - (float) $invoice->amount_received) > 0.01) {
                $issues[] = [
                    'field' => 'paid_amount vs amount_received',
                    'collection_value' => (float) $collection->paid_amount,
                    'invoice_value' => (float) $invoice->amount_received,
                ];
            }

            if (!empty($issues)) {
                $mismatches[] = [
                    'collection_id' => $collection->id,
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'issues' => $issues,
                ];
            }
        }

        $invoicesWithItemMismatch = [];
        $invoicesWithItems = Invoice::with('items')
            ->whereIn('status', ['paid', 'partial', 'pending_payment'])
            ->whereNull('cash_budget_request_id')
            ->get();

        foreach ($invoicesWithItems as $invoice) {
            $itemsTotal = $invoice->items->sum('total_price');
            if (abs((float) $invoice->subtotal - (float) $itemsTotal) > 0.01) {
                $invoicesWithItemMismatch[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'recorded_subtotal' => (float) $invoice->subtotal,
                    'calculated_subtotal' => (float) $itemsTotal,
                    'difference' => round((float) $invoice->subtotal - (float) $itemsTotal, 2),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'collection_invoice_mismatches' => $mismatches,
                'invoice_item_mismatches' => $invoicesWithItemMismatch,
                'summary' => [
                    'total_linked_collections' => $collections->count(),
                    'collections_with_issues' => count($mismatches),
                    'invoices_checked' => $invoicesWithItems->count(),
                    'invoices_with_item_mismatch' => count($invoicesWithItemMismatch),
                ],
            ],
        ]);
    }
}
