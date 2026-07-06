<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Invoice;
use App\Models\TripTicket;
use App\Models\Bus;
use App\Models\JobOrder;
use App\Models\CashBudgetRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Return the widget layout configuration based on the user's role.
     */
    public function layout(Request $request)
    {
        $role = $request->user()->role;
        
        // Executives
        if (in_array($role, ['super_admin', 'executive_vice_president'])) {
            $layout = ['revenue', 'approvals', 'fleet_status'];
        } 
        // Module Managers
        elseif (in_array($role, ['operations_manager', 'logistics_in_charge', 'purchasing_manager', 'accounting_executive', 'corporate_secretary'])) {
            $layout = ['tasks', 'fleet_status'];
        } 
        // Operators
        else {
            $layout = ['tasks', 'fleet_status'];
        }
        
        return response()->json(['layout' => $layout]);
    }

    /**
     * WIDGET: Revenue (for Executives)
     */
    public function widgetRevenue(Request $request)
    {
        $start = Carbon::now()->startOfMonth();
        $revenue = Invoice::whereIn('status', ['paid', 'partial'])
            ->where('created_at', '>=', $start)
            ->sum('total_amount');
            
        $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();
        $lastRevenue = Invoice::whereIn('status', ['paid', 'partial'])
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->sum('total_amount');
            
        $trend = 0;
        if ($lastRevenue > 0) {
            $trend = (($revenue - $lastRevenue) / $lastRevenue) * 100;
        }

        return response()->json([
            'value' => '₱' . number_format($revenue, 2),
            'label' => 'Revenue this month',
            'trend' => ($trend >= 0 ? '+' : '') . number_format($trend, 1) . '%',
            'chart' => $this->monthlyChartData()
        ]);
    }

    /**
     * WIDGET: Fleet Status
     */
    public function widgetFleet(Request $request)
    {
        $totalBuses = Bus::count();
        $availableBuses = Bus::where('status', 'available')->count();
        $maintenanceBuses = Bus::where('status', 'under_maintenance')->count();
        $onTripBuses = Bus::where('status', 'on_trip')->count();

        return response()->json([
            'value' => $availableBuses . '/' . $totalBuses,
            'label' => 'Available Fleet',
            'details' => [
                'maintenance' => $maintenanceBuses,
                'on_trip' => $onTripBuses
            ]
        ]);
    }

    /**
     * WIDGET: Tasks / My Work
     */
    public function widgetTasks(Request $request)
    {
        $user = $request->user();
        $tasks = [];

        if (in_array($user->role, ['driver'])) {
            $trips = TripTicket::where('driver_id', $user->id)
                ->whereIn('status', ['scheduled', 'in_progress'])
                ->orderBy('date_of_trip', 'asc')
                ->limit(5)
                ->get();
            foreach ($trips as $trip) {
                $tasks[] = [
                    'id' => 'trip_' . $trip->id,
                    'title' => 'Trip to ' . ($trip->destination ?? 'Unknown'),
                    'subtitle' => Carbon::parse($trip->date_of_trip)->format('M d, Y h:i A'),
                    'status' => $trip->status,
                    'type' => 'trip'
                ];
            }
        } else {
            // Generic tasks for other roles (fallback)
            $tasks[] = [
                'id' => 'task_1',
                'title' => 'Review weekly reports',
                'subtitle' => 'Due today',
                'status' => 'pending',
                'type' => 'task'
            ];
        }

        return response()->json(['tasks' => $tasks]);
    }

    /**
     * WIDGET: Approvals (For executives/managers)
     */
    public function widgetApprovals(Request $request)
    {
        // Example: pending cash budgets
        $pendingBudgets = CashBudgetRequest::where('status', 'pending_accounting')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
            
        $approvals = [];
        foreach ($pendingBudgets as $budget) {
            $approvals[] = [
                'id' => 'budget_' . $budget->id,
                'title' => 'Cash Budget: ' . ($budget->reference_number ?? 'Unknown'),
                'subtitle' => '₱' . number_format($budget->amount_requested, 2),
                'status' => 'pending',
                'type' => 'budget'
            ];
        }

        return response()->json(['approvals' => $approvals]);
    }

    // ─── Shared helpers ──────────────────────────────────────────────────────────

    /** Returns the 12-month chart data bucketed by calendar month. */
    private function monthlyChartData(): array
    {
        $year = Carbon::now()->year;
        $driver = DB::connection()->getDriverName();
        $monthExpr = match ($driver) {
            'sqlite' => "strftime('%m', created_at)",
            'mysql' => "DATE_FORMAT(created_at, '%m')",
            'pgsql' => "to_char(created_at, 'MM')",
            default => "to_char(created_at, 'MM')"
        };

        // Revenue by month (from paid/partial invoices)
        $revenueRows = Invoice::select(
                DB::raw("{$monthExpr} as month_num"),
                DB::raw('SUM(total_amount) as revenue'),
                DB::raw('COUNT(*) as bookings')
            )
            ->whereIn('status', ['paid', 'partial'])
            ->whereNull('cash_budget_request_id')
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw($monthExpr))
            ->get()
            ->keyBy('month_num');

        // Fleet utilization by month
        $totalBuses = Bus::count() ?: 1;
        $joRows = JobOrder::select(
                DB::raw("{$monthExpr} as month_num"),
                DB::raw('COUNT(DISTINCT bus_id) as active_buses')
            )
            ->whereNotNull('bus_id')
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw($monthExpr))
            ->get()
            ->keyBy('month_num');

        $months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        $result = [];
        foreach ($months as $i => $label) {
            $num = str_pad($i + 1, 2, '0', STR_PAD_LEFT);
            $rev = $revenueRows->get($num);
            $jo  = $joRows->get($num);
            $result[] = [
                'month'       => $label,
                'revenue'     => $rev ? round($rev->revenue / 1000, 1) : 0, // in K
                'bookings'    => $rev ? (int) $rev->bookings : 0,
                'utilization' => $jo
                    ? min(100, round(($jo->active_buses / $totalBuses) * 100))
                    : 0,
            ];
        }
        return $result;
    }
}
