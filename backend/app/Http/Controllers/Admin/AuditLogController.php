<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * List audit logs — Super Admin / Admin only.
     * Supports filtering by user_id, module, action, and date range.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id'    => ['nullable', 'integer', 'exists:users,id'],
            'module'     => ['nullable', 'string'],
            'action'     => ['nullable', 'in:POST,PUT,PATCH,DELETE'],
            'date_from'  => ['nullable', 'date'],
            'date_to'    => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page'   => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = AuditLog::with('user');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('module')) {
            $query->where('module', 'ilike', '%' . $request->module . '%');
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

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
}
