<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTwoFactor
{
    /**
     * Ensure the user has completed 2FA verification.
     * This middleware runs after authentication to enforce mandatory 2FA.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If 2FA is globally disabled, bypass the check
        if (!filter_var(env('REQUIRE_2FA', true), FILTER_VALIDATE_BOOLEAN)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && !$user->two_factor_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Two-factor authentication is required.',
                'requires_2fa' => true,
            ], 403);
        }

        return $next($request);
    }
}
