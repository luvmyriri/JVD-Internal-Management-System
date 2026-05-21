<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'role'                    => \App\Http\Middleware\CheckRole::class,
            'audit'                   => \App\Http\Middleware\AuditLogger::class,
            'verify.2fa'              => \App\Http\Middleware\VerifyTwoFactor::class,
            'enforce.password.change' => \App\Http\Middleware\EnforcePasswordChange::class,
        ]);

        // Apply audit logging to all API routes
        $middleware->api(append: [
            \App\Http\Middleware\AuditLogger::class,
            \App\Http\Middleware\TrackUserOnlineStatus::class,
        ]);

        $middleware->statefulApi();
        
        $middleware->validateCsrfTokens(except: [
            'api/admin/settings/landing-page',
            'api/accreditations/*/submit-kyc',
            'api/accreditations/*/submit-kyc/upload/*',
        ]);
        // Apply audit logging to all API routes
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
