<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDriverPortalAccess
{
    /**
     * The Driver portal is a personal workspace, not a supervisorial module.
     * Deliberately do not inherit the super-admin bypass used by CheckRole.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role !== 'driver') {
            return response()->json([
                'success' => false,
                'message' => 'The Driver portal is available only to driver accounts. Use Logistics to supervise driver operations.',
            ], 403);
        }

        return $next($request);
    }
}
