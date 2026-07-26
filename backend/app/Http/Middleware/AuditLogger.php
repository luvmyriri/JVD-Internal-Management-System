<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuditLogger
{
    /**
     * Known module aliases mapping sub-paths to top-level canonical modules.
     */
    private const MODULE_MAP = [
        'purchase-orders'     => 'procurement',
        'job-orders'          => 'procurement',
        'work-orders'         => 'procurement',
        'suppliers'           => 'procurement',

        'billing'             => 'accounting',
        'collections'         => 'accounting',
        'cash-budgets'        => 'accounting',
        'commissions'         => 'accounting',
        'liquidations'        => 'accounting',

        'trip-tickets'        => 'logistics',
        'fleet'               => 'logistics',
        'buses'               => 'logistics',
        'pms'                 => 'logistics',

        'joiner-departures'   => 'sales',
        'fixed-packages'      => 'sales',
        'custom-transactions' => 'sales',
        'sales-orders'        => 'sales',
        'checkout'            => 'sales',

        'employees'           => 'hr',
        'payroll'             => 'hr',
        'applications'        => 'hr',
        'internships'         => 'hr',

        'passporting'         => 'travel',
        'visa-processing'     => 'travel',

        'users'               => 'admin',
        'role-permissions'    => 'admin',
        'audit-logs'          => 'admin',
        'settings'            => 'admin',
    ];

    /**
     * Paths that should be ignored to prevent log pollution.
     */
    private const IGNORED_PATHS = [
        'ping',
        'notifications',
        'chat/typing',
        'online-status',
    ];

    /**
     * Log state-changing API actions with clean module context, entity ID, and IP address.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log state-changing HTTP methods for successful requests (2xx status code)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true) && $response->isSuccessful()) {
            $path = trim($request->path(), '/');

            // Skip ignored paths
            foreach (self::IGNORED_PATHS as $ignored) {
                if (str_contains($path, $ignored)) {
                    return $response;
                }
            }

            $user = $request->user();

            if ($user) {
                $segments = array_values(array_filter(
                    explode('/', $path),
                    fn ($s) => !in_array($s, ['api', 'v1', 'v2'], true)
                ));

                $module     = $this->extractModule($segments);
                $entityType = $this->extractEntityType($segments);
                $entityId   = $this->extractEntityId($segments, $request);
                $action     = $this->extractAction($request->method(), $segments);

                // Scrub sensitive fields before saving payload
                $payload = $request->except([
                    'password', 'password_confirmation', 'new_password',
                    'new_password_confirmation', 'current_password', '_token',
                    'secret', 'totp_secret',
                ]);

                DB::table('audit_logs')->insert([
                    'user_id'     => $user->id,
                    'action'      => $action,
                    'module'      => $module,
                    'entity_type' => $entityType,
                    'entity_id'   => $entityId,
                    'old_values'  => null, // Populated by controllers/services when tracking pre-event state
                    'new_values'  => !empty($payload) ? json_encode($payload) : null,
                    'ip_address'  => $request->ip(),
                    'created_at'  => now(),
                ]);
            }
        }

        return $response;
    }

    private function extractModule(array $segments): string
    {
        if (empty($segments)) {
            return 'general';
        }

        $raw = strtolower($segments[0]);

        if (isset(self::MODULE_MAP[$raw])) {
            return self::MODULE_MAP[$raw];
        }

        return $raw;
    }

    private function extractEntityType(array $segments): string
    {
        if (count($segments) >= 2 && !is_numeric($segments[1])) {
            return strtolower($segments[1]);
        }

        return strtolower($segments[0] ?? 'unknown');
    }

    private function extractEntityId(array $segments, Request $request): ?int
    {
        foreach ($segments as $segment) {
            if (is_numeric($segment)) {
                return (int) $segment;
            }
        }

        // Try route parameter values if path segment did not contain integer ID
        foreach ($request->route()?->parameters() ?? [] as $val) {
            if (is_numeric($val)) {
                return (int) $val;
            }
            if (is_object($val) && isset($val->id) && is_numeric($val->id)) {
                return (int) $val->id;
            }
        }

        return null;
    }

    private function extractAction(string $method, array $segments): string
    {
        $lastSegment = strtolower(end($segments) ?: '');

        $verbActions = [
            'approve'    => 'APPROVE',
            'reject'     => 'REJECT',
            'cancel'     => 'CANCEL',
            'finalize'   => 'FINALIZE',
            'disburse'   => 'DISBURSE',
            'settle'     => 'SETTLE',
            'hold'       => 'HOLD',
            'holds'      => 'HOLD',
            'deactivate' => 'DEACTIVATE',
            'activate'   => 'ACTIVATE',
            'verify'     => 'VERIFY',
        ];

        if (isset($verbActions[$lastSegment])) {
            return $verbActions[$lastSegment];
        }

        return match ($method) {
            'POST'   => 'CREATE',
            'PUT', 'PATCH' => 'UPDATE',
            'DELETE' => 'DELETE',
            default  => $method,
        };
    }
}
