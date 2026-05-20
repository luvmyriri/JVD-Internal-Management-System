<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforce password change on accounts flagged with must_change_password.
 * Blocks all API calls except /auth/logout and /auth/change-password.
 *
 * Applied in routes/api.php within the auth:sanctum middleware group.
 */
class EnforcePasswordChange
{
    /**
     * Endpoints allowed to bypass the password change gate.
     */
    private const ALLOWED_ROUTES = [
        'auth.me',
        'auth.logout',
        'auth.change-password',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password) {
            $currentRoute = $request->route()?->getName();

            if (!in_array($currentRoute, self::ALLOWED_ROUTES)) {
                return response()->json([
                    'success'                  => false,
                    'message'                  => 'Your password has been reset. You must set a new password before continuing.',
                    'requires_password_change' => true,
                ], 403);
            }
        }

        return $next($request);
    }
}
