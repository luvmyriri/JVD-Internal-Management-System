<?php

namespace App\Http\Middleware;

use App\Support\ApiErrorSanitizer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeApiErrorResponses
{
    public function handle(Request $request, Closure $next): Response
    {
        return ApiErrorSanitizer::sanitize($request, $next($request));
    }
}
