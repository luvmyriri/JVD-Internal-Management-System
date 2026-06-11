<?php

namespace App\Http\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Log a system action.
     */
    public static function log(string $action, string $module, string $entityType, $entityId, array $old = null, array $new = null)
    {
        AuditLog::create([
            'user_id'     => auth()->id() ?: 1,
            'action'      => $action,
            'module'      => $module,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'old_values'  => $old,
            'new_values'  => $new,
            'ip_address'  => Request::ip(),
            'created_at'  => now(),
        ]);
    }
}
