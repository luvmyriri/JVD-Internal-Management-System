<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    /**
     * List audit logs — Super Admin / Admin only.
     * Supports search, module, action, date_from, date_to, user_id, entity_type, entity_id filters.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search'      => ['nullable', 'string', 'max:100'],
            'user_id'     => ['nullable', 'integer', 'exists:users,id'],
            'module'      => ['nullable', 'string', 'max:100'],
            'action'      => ['nullable', 'string', 'max:100'],
            'entity_type' => ['nullable', 'string', 'max:100'],
            'entity_id'   => ['nullable', 'integer'],
            'date_from'   => ['nullable', 'date'],
            'date_to'     => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page'    => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = $this->buildFilteredQuery($request);

        $logs = $query->orderByDesc('created_at')
                      ->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data'    => AuditLogResource::collection($logs)->resolve(),
            'meta'    => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    /**
     * Summary KPI metrics for the audit trail dashboard cards.
     */
    public function stats(): JsonResponse
    {
        $today = Carbon::today();

        $totalEvents     = AuditLog::count();
        $mutationsToday  = AuditLog::whereDate('created_at', $today)->count();
        $activeUsersToday= AuditLog::whereDate('created_at', $today)->distinct('user_id')->count('user_id');

        $topModuleRow = AuditLog::select('module', DB::raw('count(*) as count'))
            ->groupBy('module')
            ->orderByDesc('count')
            ->first();

        $topModule = $topModuleRow ? $topModuleRow->module : 'general';

        $actionBreakdown = AuditLog::select('action', DB::raw('count(*) as count'))
            ->groupBy('action')
            ->pluck('count', 'action')
            ->all();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_events'       => $totalEvents,
                'mutations_today'    => $mutationsToday,
                'active_users_today' => $activeUsersToday,
                'top_module'         => $topModule,
                'action_breakdown'   => $actionBreakdown,
            ],
        ]);
    }

    /**
     * Export audit logs to a downloadable CSV stream.
     */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->buildFilteredQuery($request)->orderByDesc('created_at')->limit(2000);

        $filename = 'audit_trail_' . now()->format('Ymd_His') . '.csv';

        return response()->stream(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Timestamp', 'User', 'Employee ID', 'Role', 'Action', 'Module', 'Entity Type', 'Entity ID', 'IP Address']);

            $query->chunk(250, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    $u = $log->user;
                    fputcsv($handle, [
                        $log->id,
                        $log->created_at->toIso8601String(),
                        $u ? "{$u->first_name} {$u->last_name}" : 'System',
                        $u?->employee_id ?? 'N/A',
                        $u?->role ?? 'system',
                        $log->action,
                        $log->module,
                        $log->entity_type,
                        $log->entity_id ?? 'N/A',
                        $log->ip_address,
                    ]);
                }
            });

            fclose($handle);
        }, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ─── Query Helper ─────────────────────────────────────────────────────────────

    private function buildFilteredQuery(Request $request)
    {
        $query = AuditLog::with('user');

        $driver = DB::connection()->getDriverName();
        $like   = $driver === 'sqlite' ? 'like' : 'ilike';

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search, $like) {
                $q->where('action', $like, "%{$search}%")
                  ->orWhere('module', $like, "%{$search}%")
                  ->orWhere('entity_type', $like, "%{$search}%")
                  ->orWhere('ip_address', $like, "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search, $like) {
                      $uq->where('first_name', $like, "%{$search}%")
                         ->orWhere('last_name', $like, "%{$search}%")
                         ->orWhere('email', $like, "%{$search}%")
                         ->orWhere('employee_id', $like, "%{$search}%");
                  });

                if (is_numeric($search)) {
                    $q->orWhere('entity_id', (int) $search);
                }
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->filled('entity_id')) {
            $query->where('entity_id', $request->entity_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return $query;
    }
}
