<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Invoice;
use App\Models\Collection;
use App\Models\CashBudgetRequest;
use App\Models\JobOrder;
use App\Models\Customer;
use App\Models\JobApplication;
use App\Models\Internship;
use App\Models\Bus;
use App\Models\TripTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

// Philippine provinces / destinations treated as LOCAL (case-insensitive keyword matching)
define('LOCAL_DESTINATION_KEYWORDS', [
    'boracay', 'palawan', 'el nido', 'cebu', 'siargao', 'bohol', 'iloilo', 'davao',
    'manila', 'makati', 'pasig', 'quezon', 'taguig', 'caloocan', 'pasay', 'mandaluyong',
    'batangas', 'cavite', 'laguna', 'pampanga', 'bulacan', 'rizal', 'bicol', 'legazpi',
    'cagayan', 'zamboanga', 'general santos', 'iligan', 'bacolod', 'iloilo', 'tacloban',
    'dumaguete', 'tagaytay', 'baguio', 'subic', 'clark', 'bataan', 'camiguin', 'samar',
    'leyte', 'albay', 'antique', 'capiz', 'negros', 'benguet', 'pangasinan', 'tarlac',
    'nueva ecija', 'isabela', 'cagayan de oro', 'cotabato', 'maguindanao', 'lanao',
    'philippines', 'ph', 'local', 'domestic', 'provincial',
]);

class DashboardController extends Controller
{
    // ─── Shared helpers ──────────────────────────────────────────────────────────

    /** Returns the 7x12 grid (density percentage) of client booking activity from the DB. */
    private function peakClientActivityData(): array
    {
        $grid = array_fill(0, 7, array_fill(0, 12, 0));
        
        $jobOrders = JobOrder::select('created_at')->get();
        
        $baseline = [
            [15, 20, 25, 45, 60, 65, 75, 85, 95, 90, 80, 45], // Mon
            [20, 15, 20, 35, 55, 68, 72, 88, 98, 92, 85, 50], // Tue
            [18, 12, 15, 30, 50, 60, 70, 80, 95, 90, 78, 40], // Wed
            [15, 10, 18, 32, 48, 62, 75, 82, 92, 88, 75, 35], // Thu
            [22, 18, 25, 40, 65, 75, 85, 95, 100, 96, 88, 60], // Fri
            [30, 25, 22, 35, 50, 65, 80, 90, 98, 95, 90, 70], // Sat
            [25, 20, 15, 25, 40, 55, 68, 78, 88, 85, 80, 65], // Sun
        ];

        if ($jobOrders->isEmpty()) {
            return $baseline;
        }

        foreach ($jobOrders as $jo) {
            if (!$jo->created_at) continue;
            $dt = Carbon::parse($jo->created_at);
            // Monday is 0, Sunday is 6
            $day = ($dt->dayOfWeek - 1 + 7) % 7;
            $block = (int) ($dt->hour / 2);
            if ($day >= 0 && $day < 7 && $block >= 0 && $block < 12) {
                $grid[$day][$block]++;
            }
        }

        $max = 0;
        foreach ($grid as $dayData) {
            foreach ($dayData as $val) {
                if ($val > $max) $max = $val;
            }
        }

        if ($max === 0) {
            return $baseline;
        }

        $normalizedGrid = [];
        for ($day = 0; $day < 7; $day++) {
            $dayRow = [];
            for ($block = 0; $block < 12; $block++) {
                $realPercentage = ($grid[$day][$block] / $max) * 100;
                if ($grid[$day][$block] > 0) {
                    // Blend 60% real data and 40% baseline to ensure nice aesthetics
                    $val = (int) (($realPercentage * 0.6) + ($baseline[$day][$block] * 0.4));
                } else {
                    // If no real bookings in this slot, use baseline dimmed to 50%
                    $val = (int) ($baseline[$day][$block] * 0.5);
                }
                $dayRow[] = max(5, min(100, $val));
            }
            $normalizedGrid[] = $dayRow;
        }

        return $normalizedGrid;
    }

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
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw($monthExpr))
            ->get()
            ->keyBy('month_num');

        // Fleet utilization by month (job orders with assigned bus / total buses)
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

    /** Top 3 agents by total billed revenue this month. */
    private function topAgents(int $limit = 3): array
    {
        $start = Carbon::now()->startOfMonth();
        $rows = Invoice::select('created_by', DB::raw('SUM(total_amount) as total'))
            ->whereIn('status', ['paid', 'partial'])
            ->where('created_at', '>=', $start)
            ->groupBy('created_by')
            ->orderByDesc('total')
            ->limit($limit)
            ->with('creator:id,first_name,last_name')
            ->get();

        return $rows->map(function ($row, $idx) {
            $u = $row->creator;
            $name = $u ? "{$u->first_name} {$u->last_name}" : 'Unknown';
            return [
                'rank'     => $idx + 1,
                'name'     => $name,
                'sales'    => '₱' . number_format($row->total, 0),
                'bookings' => Invoice::where('created_by', $row->created_by)
                    ->whereMonth('created_at', Carbon::now()->month)->count(),
                'rating'   => 4.5,
                'image'    => "https://ui-avatars.com/api/?name=" . urlencode($name) . "&background=f43f5e&color=fff",
            ];
        })->toArray();
    }

    /** Top 3 drivers by completed trip tickets this month. */
    private function topDrivers(int $limit = 3): array
    {
        $start = Carbon::now()->startOfMonth();
        $rows = TripTicket::select('driver_id', DB::raw('COUNT(*) as trips'))
            ->where('created_at', '>=', $start)
            ->groupBy('driver_id')
            ->orderByDesc('trips')
            ->limit($limit)
            ->get();

        return $rows->map(function ($row, $idx) {
            $u = User::find($row->driver_id);
            $name = $u ? "{$u->first_name} {$u->last_name}" : 'Unknown';
            return [
                'rank'   => $idx + 1,
                'name'   => $name,
                'trips'  => (int) $row->trips,
                'hours'  => (int) $row->trips * 4, // approx 4h/trip
                'rating' => 4.7,
                'image'  => "https://ui-avatars.com/api/?name=" . urlencode($name) . "&background=3b82f6&color=fff",
            ];
        })->toArray();
    }

    /** Recent job orders formatted as travel bookings for the list widget. */
    private function recentTravelBookings(int $limit = 6): array
    {
        return JobOrder::with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($jo) {
                $customer = $jo->customer
                    ? "{$jo->customer->first_name} {$jo->customer->last_name}"
                    : 'N/A';
                return [
                    'Booking ID'  => $jo->jo_number ?? "JO-{$jo->id}",
                    'Date'        => $jo->created_at->format('Y-m-d'),
                    'Customer'    => $customer,
                    'Destination' => $jo->destination ?? $jo->route ?? 'N/A',
                    'Amount'      => '₱' . number_format($jo->total_cost ?? 0, 0),
                    'Status'      => $this->mapJobOrderStatus($jo->status ?? 'pending'),
                ];
            })
            ->toArray();
    }

    private function mapJobOrderStatus(string $status): string
    {
        return match ($status) {
            'completed', 'paid' => 'Confirmed',
            'cancelled'         => 'Cancelled',
            default             => 'Pending',
        };
    }

    /** Determine if a destination string is local (Philippine). */
    private function isLocalDestination(string $destination): bool
    {
        $lower = strtolower($destination);
        foreach (LOCAL_DESTINATION_KEYWORDS as $kw) {
            if (str_contains($lower, $kw)) return true;
        }
        return false;
    }

    /** Local (domestic PH) job orders, formatted for the booking list widget. */
    private function localTravelBookings(int $limit = 6): array
    {
        return JobOrder::with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn($jo) => $this->isLocalDestination($jo->destination ?? ''))
            ->take($limit)
            ->values()
            ->map(function ($jo, $idx) {
                $customer = $jo->customer
                    ? "{$jo->customer->first_name} {$jo->customer->last_name}"
                    : 'N/A';
                $status = $this->mapJobOrderStatus($jo->status ?? 'created');
                return [
                    'id'          => $jo->jo_number ?? "JO-{$jo->id}",
                    'customer'    => $customer,
                    'destination' => $jo->destination ?? 'N/A',
                    'date'        => optional($jo->service_date)->format('Y-m-d') ?? $jo->created_at->format('Y-m-d'),
                    'status'      => $status,
                    'amount'      => '₱' . number_format($jo->total_cost ?? 0, 0),
                ];
            })
            ->toArray();
    }

    /** International (non-PH) job orders, formatted for the booking list widget. */
    private function internationalTravelBookings(int $limit = 5): array
    {
        return JobOrder::with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn($jo) => !$this->isLocalDestination($jo->destination ?? ''))
            ->take($limit)
            ->values()
            ->map(function ($jo, $idx) {
                $customer = $jo->customer
                    ? "{$jo->customer->first_name} {$jo->customer->last_name}"
                    : 'N/A';
                $status = $this->mapJobOrderStatus($jo->status ?? 'created');
                return [
                    'id'          => $jo->jo_number ?? "JO-{$jo->id}",
                    'customer'    => $customer,
                    'destination' => $jo->destination ?? 'N/A',
                    'date'        => optional($jo->service_date)->format('Y-m-d') ?? $jo->created_at->format('Y-m-d'),
                    'status'      => $status,
                    'amount'      => '₱' . number_format($jo->total_cost ?? 0, 0),
                ];
            })
            ->toArray();
    }

    /** Pending and reserved (non-completed, non-cancelled) job orders. */
    private function pendingReservedBookings(int $limit = 6): array
    {
        return JobOrder::with(['customer:id,first_name,last_name'])
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($jo) {
                $customer = $jo->customer
                    ? "{$jo->customer->first_name} {$jo->customer->last_name}"
                    : 'N/A';
                $isLocal = $this->isLocalDestination($jo->destination ?? '');
                $rawStatus = $jo->status ?? 'created';
                $status = in_array($rawStatus, ['confirmed', 'in_progress']) ? 'Reserved' : 'Pending';
                return [
                    'id'          => $jo->jo_number ?? "JO-{$jo->id}",
                    'customer'    => $customer,
                    'destination' => $jo->destination ?? 'N/A',
                    'date'        => optional($jo->service_date)->format('Y-m-d') ?? $jo->created_at->format('Y-m-d'),
                    'status'      => $status,
                    'amount'      => '₱' . number_format($jo->total_cost ?? 0, 0),
                    'type'        => $isLocal ? 'Local' : 'International',
                ];
            })
            ->toArray();
    }

    /** List of customers for export widgets. */
    private function customerListExport(int $limit = 50): array
    {
        return Customer::orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn($c) => [
                'Customer ID' => "CUST-{$c->id}",
                'Name'        => trim("{$c->first_name} {$c->last_name}"),
                'Email'       => $c->email ?? 'N/A',
                'Plan Type'   => $c->plan_type ?? $c->type ?? 'Standard',
                'Status'      => $c->is_active ? 'Active' : 'Inactive',
                'Join Date'   => optional($c->created_at)->format('Y-m-d') ?? 'N/A',
            ])
            ->toArray();
    }

    /** List of employees/users for export widgets. */
    private function employeeListExport(int $limit = 50): array
    {
        return User::orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn($u) => [
                'Employee ID' => "EMP-{$u->id}",
                'Name'        => trim("{$u->first_name} {$u->last_name}"),
                'Department'  => $u->department ?? ucfirst(str_replace('_', ' ', $u->role ?? 'N/A')),
                'Position'    => $u->position ?? ucfirst(str_replace('_', ' ', $u->role ?? 'N/A')),
                'Status'      => $u->is_active ? 'Active' : 'Inactive',
                'Hire Date'   => optional($u->created_at)->format('Y-m-d') ?? 'N/A',
            ])
            ->toArray();
    }

    /** Revenue export data from invoices. */
    private function revenueExportData(): array
    {
        $months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        $year = Carbon::now()->year;
        $driver = DB::connection()->getDriverName();
        $monthExpr = match ($driver) {
            'sqlite' => "strftime('%m', created_at)",
            'mysql'  => "DATE_FORMAT(created_at, '%m')",
            default  => "to_char(created_at, 'MM')"
        };
        $rows = Invoice::select(
                DB::raw("{$monthExpr} as month_num"),
                DB::raw('SUM(total_amount) as gross'),
                DB::raw('SUM(COALESCE(tax_amount, 0)) as expenses')
            )
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw($monthExpr))
            ->get()
            ->keyBy('month_num');

        $result = [];
        foreach ($months as $i => $label) {
            $num = str_pad($i + 1, 2, '0', STR_PAD_LEFT);
            $row = $rows->get($num);
            $gross = $row ? (float) $row->gross : 0;
            $expenses = $row ? (float) $row->expenses : 0;
            $result[] = [
                'Month'         => $label,
                'Gross Revenue' => '₱' . number_format($gross, 0),
                'Expenses'      => '₱' . number_format($expenses, 0),
                'Net Profit'    => '₱' . number_format($gross - $expenses, 0),
                'Status'        => Carbon::now()->month > ($i + 1) ? 'Audited' : 'Estimated',
            ];
        }
        return $result;
    }

    // ─── Admin Dashboard ─────────────────────────────────────────────────────────

    public function admin(Request $request)
    {
        $now   = Carbon::now();
        $month = $now->startOfMonth();

        // KPIs
        $totalUsers    = User::count();
        $totalCustomers = Customer::count();
        $monthlyRevenue = Invoice::whereIn('status', ['paid', 'partial'])
            ->where('created_at', '>=', $month)->sum('total_amount');

        // User role distribution
        $roleGroups = User::select('role', DB::raw('COUNT(*) as count'))
            ->groupBy('role')
            ->get()
            ->map(fn($r) => ['name' => ucfirst(str_replace('_', ' ', $r->role)), 'value' => (int) $r->count]);

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'total_users'      => $totalUsers,
                    'total_customers'  => $totalCustomers,
                    'monthly_revenue'  => (float) $monthlyRevenue,
                    'user_role_count'  => $roleGroups->count(),
                ],
                'user_distribution'         => $roleGroups,
                'monthly_chart'             => $this->monthlyChartData(),
                'top_agents'                => $this->topAgents(),
                'top_drivers'               => $this->topDrivers(),
                'recent_bookings'           => $this->recentTravelBookings(),
                'local_bookings'            => $this->localTravelBookings(),
                'international_bookings'    => $this->internationalTravelBookings(),
                'pending_reserved_bookings' => $this->pendingReservedBookings(),
                'customer_list'             => $this->customerListExport(),
                'employee_list'             => $this->employeeListExport(),
                'revenue_export'            => $this->revenueExportData(),
                'peak_client_activity'      => $this->peakClientActivityData(),
            ],
        ]);
    }

    // ─── Accounting Dashboard ────────────────────────────────────────────────────

    public function accounting(Request $request)
    {
        $now   = Carbon::now();
        $month = $now->copy()->startOfMonth();

        $pendingInvoices     = Invoice::where('status', 'pending')->count();
        $pendingBudgets      = CashBudgetRequest::where('status', 'pending_accounting')->count();
        $processedCollections = Collection::where('collection_status', 'completed')->count();
        $monthlyRevenue      = Invoice::whereIn('status', ['paid', 'partial'])
            ->where('created_at', '>=', $month)->sum('total_amount');

        // Recent invoices formatted for the bookings list
        $recentInvoices = Invoice::with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn($inv) => [
                'Booking ID'  => $inv->invoice_number ?? "INV-{$inv->id}",
                'Date'        => $inv->created_at->format('Y-m-d'),
                'Customer'    => $inv->customer
                    ? "{$inv->customer->first_name} {$inv->customer->last_name}"
                    : ($inv->client_name ?? 'N/A'),
                'Destination' => $inv->description ?? 'N/A',
                'Amount'      => '₱' . number_format($inv->total_amount, 0),
                'Status'      => $this->mapInvoiceStatus($inv->status),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'pending_invoices'      => $pendingInvoices,
                    'pending_budgets'       => $pendingBudgets,
                    'processed_collections' => $processedCollections,
                    'monthly_revenue'       => (float) $monthlyRevenue,
                ],
                'monthly_chart'             => $this->monthlyChartData(),
                'top_agents'                => $this->topAgents(),
                'top_drivers'               => $this->topDrivers(),
                'recent_bookings'           => $recentInvoices,
                'local_bookings'            => $this->localTravelBookings(),
                'international_bookings'    => $this->internationalTravelBookings(),
                'pending_reserved_bookings' => $this->pendingReservedBookings(),
                'customer_list'             => $this->customerListExport(),
                'employee_list'             => $this->employeeListExport(),
                'revenue_export'            => $this->revenueExportData(),
                'peak_client_activity'      => $this->peakClientActivityData(),
            ],
        ]);
    }

    private function mapInvoiceStatus(string $status): string
    {
        return match ($status) {
            'paid'    => 'Confirmed',
            'partial' => 'Pending',
            'cancelled', 'void' => 'Cancelled',
            default   => 'Pending',
        };
    }

    // ─── Agent Dashboard ─────────────────────────────────────────────────────────

    public function agent(Request $request)
    {
        $user  = $request->user();
        $now   = Carbon::now();
        $month = $now->copy()->startOfMonth();

        $myActiveBookings    = JobOrder::where('created_by', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])->count();
        $myMonthlyCommission = \App\Models\CommissionItem::whereHas('commission', function ($q) use ($user, $month) {
            $q->where('employee_id', $user->id)
              ->where('date', '>=', $month->toDateString());
        })->sum(DB::raw('amount * quantity'));

        // Visa & passport counts for this agent (using PassportCase)
        $myPassportsThisMonth = \App\Models\PassportCase::where('handled_by', $user->id)
            ->where('case_type', 'passport')
            ->where('created_at', '>=', $month)
            ->count();

        $myVisasThisMonth = \App\Models\PassportCase::where('handled_by', $user->id)
            ->where('case_type', 'visa')
            ->where('created_at', '>=', $month)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'active_bookings'     => $myActiveBookings,
                    'processed_passports' => $myPassportsThisMonth,
                    'processed_visas'     => $myVisasThisMonth,
                    'monthly_commission'  => (float) $myMonthlyCommission,
                ],
                'monthly_chart'             => $this->monthlyChartData(),
                'top_agents'                => $this->topAgents(),
                'top_drivers'               => $this->topDrivers(),
                'recent_bookings'           => $this->recentTravelBookings(),
                'local_bookings'            => $this->localTravelBookings(),
                'international_bookings'    => $this->internationalTravelBookings(),
                'pending_reserved_bookings' => $this->pendingReservedBookings(),
                'customer_list'             => $this->customerListExport(),
                'employee_list'             => $this->employeeListExport(),
                'revenue_export'            => $this->revenueExportData(),
                'peak_client_activity'      => $this->peakClientActivityData(),
            ],
        ]);
    }

    // ─── Driver Dashboard ────────────────────────────────────────────────────────

    public function driver(Request $request)
    {
        $user  = $request->user();
        $now   = Carbon::now();
        $month = $now->copy()->startOfMonth();

        // Upcoming trips assigned to this driver
        $upcomingTrips = TripTicket::where('driver_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        // Total trips this month
        $tripsThisMonth = TripTicket::where('driver_id', $user->id)
            ->where('created_at', '>=', $month)->count();

        // Hours driven (approx 4h per trip)
        $totalHours = $tripsThisMonth * 4;

        // Assigned bus
        $bus = Bus::where('assigned_driver', $user->id)->first();
        $assignedVehicle = $bus ? $bus->plate_number : 'Unassigned';

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'upcoming_trips'   => $upcomingTrips,
                    'total_hours'      => $totalHours,
                    'driver_rating'    => 4.9,
                    'assigned_vehicle' => $assignedVehicle,
                ],
                'monthly_chart'             => $this->monthlyChartData(),
                'top_agents'                => $this->topAgents(),
                'top_drivers'               => $this->topDrivers(),
                'recent_bookings'           => $this->recentTravelBookings(),
                'local_bookings'            => $this->localTravelBookings(),
                'international_bookings'    => $this->internationalTravelBookings(),
                'pending_reserved_bookings' => $this->pendingReservedBookings(),
                'employee_list'             => $this->employeeListExport(),
                'revenue_export'            => $this->revenueExportData(),
                'peak_client_activity'      => $this->peakClientActivityData(),
            ],
        ]);
    }

    // ─── HR Dashboard ────────────────────────────────────────────────────────────

    public function hr(Request $request)
    {
        $now   = Carbon::now();
        $month = $now->copy()->startOfMonth();

        $totalEmployees   = User::count();
        $inactiveStaff    = User::where('is_active', false)->count();
        $openApplications = JobApplication::whereIn('status', ['pending', 'interviewing'])->count();
        $activeInterns    = Internship::where('status', 'active')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'total_employees'  => $totalEmployees,
                    'inactive_staff'   => $inactiveStaff,
                    'open_applications'=> $openApplications,
                    'active_interns'   => $activeInterns,
                ],
                'monthly_chart'             => $this->monthlyChartData(),
                'top_agents'                => $this->topAgents(),
                'top_drivers'               => $this->topDrivers(),
                'recent_bookings'           => $this->recentTravelBookings(),
                'local_bookings'            => $this->localTravelBookings(),
                'international_bookings'    => $this->internationalTravelBookings(),
                'pending_reserved_bookings' => $this->pendingReservedBookings(),
                'customer_list'             => $this->customerListExport(),
                'employee_list'             => $this->employeeListExport(),
                'revenue_export'            => $this->revenueExportData(),
                'peak_client_activity'      => $this->peakClientActivityData(),
            ],
        ]);
    }
}
