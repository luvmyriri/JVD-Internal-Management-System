<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuditLogger
{
    /**
     * Log every state-changing action with user ID, timestamp, IP address,
     * and old/new values per the security architecture requirements.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log state-changing methods
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $user = $request->user();

            if ($user) {
                DB::table('audit_logs')->insert([
                    'user_id' => $user->id,
                    'action' => $request->method(),
                    'module' => $this->extractModule($request->path()),
                    'entity_type' => $this->extractEntityType($request->path()),
                    'entity_id' => $this->extractEntityId($request->path()),
                    'old_values' => null, // Set in individual controllers/services
                    'new_values' => json_encode($request->except([
                        'password', 'password_confirmation', 'new_password', 
                        'new_password_confirmation', 'current_password', '_token'
                    ])),
                    'ip_address' => $request->ip(),
                    'created_at' => now(),
                ]);
            }
        }

        return $response;
    }

    private function extractModule(string $path): string
    {
        $segments = explode('/', trim($path, '/'));
        // e.g., api/purchase-orders -> procurement
        return $segments[1] ?? 'unknown';
    }

    private function extractEntityType(string $path): string
    {
        $segments = explode('/', trim($path, '/'));
        return $segments[1] ?? 'unknown';
    }

    private function extractEntityId(string $path): ?int
    {
        $segments = explode('/', trim($path, '/'));
        foreach ($segments as $segment) {
            if (is_numeric($segment)) {
                return (int) $segment;
            }
        }
        return null;
    }
}
